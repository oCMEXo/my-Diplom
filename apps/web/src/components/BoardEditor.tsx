import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import type Konva from "konva";
import { Arrow, Circle as KonvaCircle, Ellipse, Group, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import {
  PALETTE,
  arrowStroke,
  TEXT_SIZE,
  addShape,
  boardBounds,
  newShapeId,
  openBoard,
  patchShape,
  readShapes,
  removeShape,
  shapesToSvg,
  type BoardShape,
  type ShapeType,
} from "../lib/board";
import { Circle, Download, MousePointer2, MoveUpRight, Redo2, Square, Trash2, Type, Undo2, type LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { useCollabDoc, type CollabStatus } from "../lib/useCollabDoc";

type Tool = "select" | ShapeType;

const TOOLS: { id: Tool; label: string; icon: LucideIcon }[] = [
  { id: "select", label: "Выбор", icon: MousePointer2 },
  { id: "rect", label: "Прямоугольник", icon: Square },
  { id: "ellipse", label: "Овал", icon: Circle },
  { id: "text", label: "Текст", icon: Type },
  { id: "arrow", label: "Стрелка", icon: MoveUpRight },
];

const SAFE_COLOR = /^#[0-9a-f]{6}$/i;

interface RemoteCursor {
  clientId: number;
  name: string;
  color: string;
  x: number;
  y: number;
}

function download(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
}

export function BoardEditor({
  fileId,
  readOnly,
  fileName,
  onStatusChange,
}: {
  fileId: string;
  readOnly: boolean;
  fileName: string;
  onStatusChange?: (status: CollabStatus) => void;
}) {
  const { provider, status } = useCollabDoc(fileId);
  useEffect(() => onStatusChange?.(status), [status, onStatusChange]);
  const board = useMemo(() => (provider ? openBoard(provider.document) : null), [provider]);

  const [shapes, setShapes] = useState<BoardShape[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState(PALETTE[0]!);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);
  const [size, setSize] = useState({ width: 800, height: 600 });

  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const shapesLayerRef = useRef<Konva.Layer>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const draft = useRef<{ id: string; startX: number; startY: number; type: ShapeType } | null>(null);
  const lastCursorSent = useRef(0);
  const undoManager = useRef<Y.UndoManager | null>(null);

  const canEdit = !readOnly;

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setSize({ width: element.clientWidth, height: element.clientHeight }),
    );
    observer.observe(element);
    setSize({ width: element.clientWidth, height: element.clientHeight });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!board) return;
    const refresh = () => setShapes(readShapes(board));
    board.shapes.observeDeep(refresh);
    board.order.observe(refresh);
    refresh();

    const manager = new Y.UndoManager([board.shapes, board.order]);
    undoManager.current = manager;
    return () => {
      board.shapes.unobserveDeep(refresh);
      board.order.unobserve(refresh);
      manager.destroy();
      undoManager.current = null;
    };
  }, [board]);

  useEffect(() => {
    const awareness = provider?.awareness;
    if (!awareness) return;
    const refresh = () => {
      const next: RemoteCursor[] = [];
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === awareness.clientID) return;
        const user = state.user as { name?: unknown; color?: unknown } | undefined;
        const cursor = state.cursor as { x?: unknown; y?: unknown } | undefined;
        if (!user || typeof cursor?.x !== "number" || typeof cursor?.y !== "number") return;
        next.push({
          clientId,
          name: typeof user.name === "string" ? user.name.slice(0, 24) : "?",
          color: typeof user.color === "string" && SAFE_COLOR.test(user.color) ? user.color : "#64748b",
          x: cursor.x,
          y: cursor.y,
        });
      });
      setCursors(next);
    };
    awareness.on("change", refresh);
    refresh();
    return () => awareness.off("change", refresh);
  }, [provider]);

  useEffect(() => {
    const transformer = transformerRef.current;
    const layer = shapesLayerRef.current;
    if (!transformer || !layer) return;
    const selected = shapes.find((shape) => shape.id === selectedId);
    const node =
      canEdit && selected && selected.type !== "arrow" && editingId !== selectedId
        ? layer.findOne((candidate: Konva.Node) => candidate.id() === selectedId)
        : null;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedId, shapes, canEdit, editingId]);

  const update = useCallback(
    (id: string, patch: Partial<Omit<BoardShape, "id">>) => {
      if (board) patchShape(board, id, patch);
    },
    [board],
  );

  function pointer(event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    return event.target.getStage()?.getPointerPosition() ?? { x: 0, y: 0 };
  }

  function handleMouseDown(event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (!board || !canEdit) return;
    const onEmptySpace = event.target === event.target.getStage();

    if (tool === "select") {
      if (onEmptySpace) setSelectedId(null);
      return;
    }

    const { x, y } = pointer(event);
    const id = newShapeId();
    const base: BoardShape = { id, type: tool, x, y, w: 0, h: 0, x2: x, y2: y, fill: color, text: "" };

    if (tool === "text") {
      // Otherwise the browser then focuses the board itself, the new text field loses focus at once
      // and, still empty, is removed.
      event.evt.preventDefault();
      addShape(board, { ...base, w: 220, h: TEXT_SIZE * 1.4 });
      setSelectedId(id);
      setEditingId(id);
      setEditingText("");
      setTool("select");
      return;
    }

    addShape(board, base);
    draft.current = { id, startX: x, startY: y, type: tool };
    setSelectedId(id);
  }

  function handleMouseMove(event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    const { x, y } = pointer(event);

    const now = performance.now();
    if (provider && now - lastCursorSent.current > 50) {
      lastCursorSent.current = now;
      provider.setAwarenessField("cursor", { x, y });
    }

    const current = draft.current;
    if (!current) return;
    if (current.type === "arrow") {
      update(current.id, { x2: x, y2: y });
    } else {
      update(current.id, {
        x: Math.min(current.startX, x),
        y: Math.min(current.startY, y),
        w: Math.abs(x - current.startX),
        h: Math.abs(y - current.startY),
      });
    }
  }

  function handleMouseUp() {
    const current = draft.current;
    draft.current = null;
    if (!current || !board) return;
    const shape = readShapes(board).find((candidate) => candidate.id === current.id);
    if (!shape) return;

    if (current.type === "arrow") {
      if (Math.hypot(shape.x2 - shape.x, shape.y2 - shape.y) < 10) removeShape(board, current.id);
    } else if (shape.w < 6 && shape.h < 6) {
      update(current.id, { w: 140, h: 90 });
    }
    setTool("select");
  }

  /** The keyboard's way to draw: the shape appears in the middle of the visible board, selected. */
  function placeShape(type: ShapeType) {
    if (!board || !canEdit) return;
    const id = newShapeId();
    // Shapes added one after another do not land exactly on top of each other.
    const offset = (shapes.length % 5) * 16;
    const cx = size.width / 2 + offset;
    const cy = size.height / 2 + offset;
    const base: BoardShape = { id, type, x: cx - 70, y: cy - 45, w: 140, h: 90, x2: cx - 70, y2: cy - 45, fill: color, text: "" };
    if (type === "arrow") addShape(board, { ...base, x: cx - 70, y: cy, x2: cx + 70, y2: cy, w: 0, h: 0 });
    else if (type === "text") addShape(board, { ...base, x: cx - 110, w: 220, h: TEXT_SIZE * 1.4 });
    else addShape(board, base);
    setSelectedId(id);
    setTool("select");
    if (type === "text") {
      setEditingId(id);
      setEditingText("");
    } else {
      boardRef.current?.focus();
    }
  }

  function commitText() {
    if (!board || !editingId) return;
    const id = editingId;
    setEditingId(null);
    if (editingText.trim() === "") removeShape(board, id);
    else update(id, { text: editingText });
  }

  function deleteSelected() {
    if (board && selectedId && canEdit) {
      removeShape(board, selectedId);
      setSelectedId(null);
    }
  }

  function chooseColor(next: string) {
    setColor(next);
    if (selectedId && canEdit) update(selectedId, { fill: next });
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (editingId) return;
    const current = shapes.find((shape) => shape.id === selectedId);
    const step = event.shiftKey ? 1 : 10;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const move = moves[event.key];
    if (move && current && canEdit) {
      event.preventDefault();
      const [dx, dy] = move;
      update(current.id, { x: current.x + dx, y: current.y + dy, x2: current.x2 + dx, y2: current.y2 + dy });
    } else if ((event.key === "]" || event.key === "[") && shapes.length > 0) {
      // Choosing a shape without a mouse: [ and ] go through them in the order they were drawn.
      event.preventDefault();
      const index = shapes.findIndex((shape) => shape.id === selectedId);
      const next = event.key === "]" ? (index + 1) % shapes.length : index <= 0 ? shapes.length - 1 : index - 1;
      setSelectedId(shapes[next]!.id);
    } else if (event.key === "Enter" && current?.type === "text" && canEdit) {
      event.preventDefault();
      setEditingId(current.id);
      setEditingText(current.text);
    } else if (event.key === "Escape" && selectedId) {
      setSelectedId(null);
    } else if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
      event.preventDefault();
      deleteSelected();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) undoManager.current?.redo();
      else undoManager.current?.undo();
    }
  }

  function exportPng() {
    const layer = shapesLayerRef.current;
    if (!layer) return;
    const bounds = boardBounds(shapes);
    const source = layer.toCanvas({ ...bounds, pixelRatio: 2 });
    const output = document.createElement("canvas");
    output.width = source.width;
    output.height = source.height;
    const context = output.getContext("2d")!;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, output.width, output.height);
    context.drawImage(source, 0, 0);
    download(output.toDataURL("image/png"), `${fileName}.png`);
  }

  function exportSvg() {
    const blob = new Blob([shapesToSvg(shapes)], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    download(url, `${fileName}.svg`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const editing = shapes.find((shape) => shape.id === editingId);
  const draggable = canEdit && tool === "select";

  function selectable(id: string) {
    const pickShape = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (tool === "select") {
        event.cancelBubble = true;
        setSelectedId(id);
      }
    };
    return {
      id,
      draggable,
      onMouseDown: pickShape,
      onTouchStart: pickShape,
    };
  }

  function renderShape(shape: BoardShape) {
    const common = selectable(shape.id);
    const stroke = selectedId === shape.id && !canEdit ? "#2563eb" : "#334155";

    switch (shape.type) {
      case "rect":
        return (
          <Rect
            key={shape.id}
            {...common}
            x={shape.x}
            y={shape.y}
            width={shape.w}
            height={shape.h}
            cornerRadius={6}
            fill={shape.fill}
            stroke={stroke}
            strokeWidth={1.5}
            onDragMove={(e) => update(shape.id, { x: e.target.x(), y: e.target.y() })}
            onTransformEnd={(e) => {
              const node = e.target;
              const w = Math.max(10, node.width() * node.scaleX());
              const h = Math.max(10, node.height() * node.scaleY());
              node.scaleX(1);
              node.scaleY(1);
              update(shape.id, { x: node.x(), y: node.y(), w, h });
            }}
          />
        );
      case "ellipse":
        return (
          <Ellipse
            key={shape.id}
            {...common}
            x={shape.x + shape.w / 2}
            y={shape.y + shape.h / 2}
            radiusX={Math.max(shape.w / 2, 1)}
            radiusY={Math.max(shape.h / 2, 1)}
            fill={shape.fill}
            stroke={stroke}
            strokeWidth={1.5}
            onDragMove={(e) =>
              update(shape.id, { x: e.target.x() - shape.w / 2, y: e.target.y() - shape.h / 2 })
            }
            onTransformEnd={(e) => {
              const node = e.target as Konva.Ellipse;
              const w = Math.max(10, node.radiusX() * 2 * node.scaleX());
              const h = Math.max(10, node.radiusY() * 2 * node.scaleY());
              node.scaleX(1);
              node.scaleY(1);
              update(shape.id, { x: node.x() - w / 2, y: node.y() - h / 2, w, h });
            }}
          />
        );
      case "text":
        return (
          <Text
            key={shape.id}
            {...common}
            x={shape.x}
            y={shape.y}
            width={shape.w}
            text={shape.id === editingId ? "" : shape.text || "Текст"}
            fontSize={TEXT_SIZE}
            fill="#0f172a"
            onDblClick={() => {
              if (!canEdit) return;
              setEditingId(shape.id);
              setEditingText(shape.text);
            }}
            onDragMove={(e) => update(shape.id, { x: e.target.x(), y: e.target.y() })}
            onTransformEnd={(e) => {
              const node = e.target;
              const w = Math.max(40, node.width() * node.scaleX());
              node.scaleX(1);
              node.scaleY(1);
              update(shape.id, { x: node.x(), y: node.y(), w });
            }}
          />
        );
      case "arrow": {
        const stroke = arrowStroke(shape.fill);
        return (
          <Arrow
            key={shape.id}
            {...common}
            x={0}
            y={0}
            points={[shape.x, shape.y, shape.x2, shape.y2]}
            stroke={stroke}
            fill={stroke}
            strokeWidth={3}
            hitStrokeWidth={14}
            pointerLength={12}
            pointerWidth={12}
            onDragEnd={(e) => {
              const dx = e.target.x();
              const dy = e.target.y();
              e.target.position({ x: 0, y: 0 });
              update(shape.id, { x: shape.x + dx, y: shape.y + dy, x2: shape.x2 + dx, y2: shape.y2 + dy });
            }}
          />
        );
      }
    }
  }

  const selected = shapes.find((shape) => shape.id === selectedId);

  const toolButton = (active: boolean) =>
    cn(
      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition",
      active ? "bg-accent text-accent-fg" : "text-muted hover:bg-raised hover:text-fg",
    );

  return (
    <div
      className="relative h-full outline-none"
      ref={boardRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={
        canEdit
          ? "Доска. Кнопка инструмента, нажатая клавишей Enter, добавляет фигуру в центр. Квадратные скобки выбирают фигуру, стрелки двигают её (Shift — точнее), Enter правит подпись, Delete удаляет, Ctrl+Z отменяет."
          : "Доска, только просмотр. Квадратные скобки выбирают фигуру."
      }
      data-shape-count={shapes.length}
      data-selected-shape={selected ? `${Math.round(selected.x)},${Math.round(selected.y)}` : ""}
    >
      <div ref={containerRef} className="board-paper absolute inset-0 overflow-hidden">
        {canEdit && (
          // Centred by the wrapper: a transform here would be overridden by the appearing animation.
          <div className="pointer-events-none absolute inset-x-2 bottom-5 z-10 flex justify-center">
            <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-surface/95 p-1.5 shadow-pop backdrop-blur [scrollbar-width:none] animate-pop">
              {TOOLS.map((item) => (
                <button
                  key={item.id}
                  // Pressed from the keyboard (no pointer, so detail is 0) a shape tool adds its shape at once:
                  // there is no mouse to draw it with.
                  onClick={(event) => (event.detail === 0 && item.id !== "select" ? placeShape(item.id) : setTool(item.id))}
                  aria-label={item.label}
                  aria-pressed={tool === item.id}
                  title={item.id === "select" ? item.label : `${item.label} (с клавиатуры: Enter добавляет в центр доски)`}
                  className={toolButton(tool === item.id)}
                >
                  <item.icon size={20} />
                </button>
              ))}
              <span className="mx-1.5 h-6 w-px bg-line" />
              <span className="flex items-center gap-1.5 px-1">
                {PALETTE.map((swatch) => (
                  <button
                    key={swatch}
                    aria-label={`Цвет ${PALETTE.indexOf(swatch) + 1} из ${PALETTE.length}`}
                    onClick={() => chooseColor(swatch)}
                    style={{ backgroundColor: swatch }}
                    className={cn(
                      "h-6 w-6 shrink-0 rounded-full border border-white/25 transition hover:scale-110",
                      (selected?.fill ?? color) === swatch ? "scale-110 ring-2 ring-accent ring-offset-2 ring-offset-surface" : "",
                    )}
                  />
                ))}
              </span>
              <span className="mx-1.5 h-6 w-px bg-line" />
              <button
                onClick={() => undoManager.current?.undo()}
                aria-label="Отменить"
                title="Отменить"
                className={toolButton(false)}
              >
                <Undo2 size={20} />
              </button>
              <button
                onClick={() => undoManager.current?.redo()}
                aria-label="Повторить"
                title="Повторить"
                className={toolButton(false)}
              >
                <Redo2 size={20} />
              </button>
              <button
                onClick={deleteSelected}
                disabled={!selectedId}
                aria-label="Удалить"
                title="Удалить выбранное"
                className={cn(toolButton(false), "disabled:opacity-30 enabled:hover:text-bad")}
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        )}

        <div className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-lg bg-surface/95 p-1 shadow-card backdrop-blur">
          <button
            onClick={exportPng}
            title="Скачать как PNG"
            className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted transition hover:bg-raised hover:text-fg"
          >
            <Download size={16} />
            PNG
          </button>
          <button
            onClick={exportSvg}
            title="Скачать как SVG"
            className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted transition hover:bg-raised hover:text-fg"
          >
            <Download size={16} />
            SVG
          </button>
        </div>

        {shapes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="rounded-lg bg-white/70 px-4 py-2 text-base text-slate-500 shadow-sm">
              {canEdit ? "Выберите фигуру внизу и протяните по полотну" : "Доска пока пуста"}
            </p>
          </div>
        )}

        <Stage
          width={size.width}
          height={size.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          onMouseLeave={() => provider?.setAwarenessField("cursor", null)}
          // A finger on the board draws; it must not scroll the page at the same time.
          style={{ cursor: tool === "select" ? "default" : "crosshair", touchAction: "none" }}
        >
          <Layer ref={shapesLayerRef}>{shapes.map(renderShape)}</Layer>
          <Layer>
            <Transformer
              ref={transformerRef}
              rotateEnabled={false}
              keepRatio={false}
              enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right"]}
            />
            {canEdit && selected?.type === "arrow" && (
              <>
                <KonvaCircle
                  x={selected.x}
                  y={selected.y}
                  radius={6}
                  fill="#2563eb"
                  draggable
                  onDragMove={(e) => update(selected.id, { x: e.target.x(), y: e.target.y() })}
                />
                <KonvaCircle
                  x={selected.x2}
                  y={selected.y2}
                  radius={6}
                  fill="#2563eb"
                  draggable
                  onDragMove={(e) => update(selected.id, { x2: e.target.x(), y2: e.target.y() })}
                />
              </>
            )}
            {cursors.map((cursor) => (
              <Group key={cursor.clientId} x={cursor.x} y={cursor.y} listening={false}>
                <Line points={[0, 0, 0, 16, 5, 12, 11, 12]} closed fill={cursor.color} stroke="#ffffff" strokeWidth={1} />
                <Rect x={12} y={14} width={cursor.name.length * 8 + 12} height={20} cornerRadius={4} fill={cursor.color} />
                <Text x={18} y={18} text={cursor.name} fontSize={13} fill="#111827" />
              </Group>
            ))}
          </Layer>
        </Stage>

        {editing && (
          <textarea
            autoFocus
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => {
              if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) {
                e.preventDefault();
                commitText();
              }
            }}
            style={{
              position: "absolute",
              left: editing.x,
              top: editing.y,
              width: editing.w,
              fontSize: TEXT_SIZE,
              lineHeight: 1,
            }}
            className="resize-none rounded border border-blue-400 bg-white/90 p-0 text-slate-900 outline-none"
            rows={2}
          />
        )}
      </div>
    </div>
  );
}
