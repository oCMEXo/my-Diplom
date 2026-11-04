-- Every renewal of a session looks its refresh token up by hash.
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- Addresses are compared in lower case from now on. If two accounts differ only by case, the older one
-- gets the address and the other keeps its spelling, so that no account is lost by this migration.
UPDATE "users" AS u
SET "email" = lower(u."email")
WHERE u."email" <> lower(u."email")
  AND NOT EXISTS (SELECT 1 FROM "users" AS o WHERE o."email" = lower(u."email"))
  AND u."id" = (
    SELECT o."id" FROM "users" AS o WHERE lower(o."email") = lower(u."email") ORDER BY o."created_at", o."id" LIMIT 1
  );
