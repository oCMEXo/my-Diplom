from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
SHOTS = HERE.parent / "thesis" / "screenshots"
FRAMES = ["10-invite-landing", "03-editor", "04-markdown", "05-board", "06-invite"]
WIDTH = 900
SECONDS_PER_FRAME = 2.2

frames = []
for name in FRAMES:
    shot = Image.open(SHOTS / f"{name}.png").convert("RGB")
    shot = shot.resize((WIDTH, round(shot.height * WIDTH / shot.width)), Image.LANCZOS)
    frames.append(shot.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE))

out = HERE / "demo.gif"
frames[0].save(
    out,
    save_all=True,
    append_images=frames[1:],
    duration=round(SECONDS_PER_FRAME * 1000),
    loop=0,
    optimize=True,
)
print("written", out, f"{out.stat().st_size / 1024:.0f} KB")
