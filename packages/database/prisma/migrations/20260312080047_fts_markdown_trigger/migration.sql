-- Create the document_search_trigger function to automatically update searchVector
CREATE OR REPLACE FUNCTION document_search_trigger() RETURNS trigger AS $$
BEGIN
  -- We use 'simple' dictionary for better support of Vietnamese characters and markdown
  -- We include both title (A-weight) and markdownContent (B-weight)
  NEW."searchVector" := 
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') || 
    setweight(to_tsvector('simple', coalesce(NEW."markdownContent", coalesce(NEW."ocrText", ''))), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any (from earlier iterations)
DROP TRIGGER IF EXISTS tsvectorupdate ON "Document";

-- Create trigger on Document table
CREATE TRIGGER tsvectorupdate 
BEFORE INSERT OR UPDATE
ON "Document"
FOR EACH ROW EXECUTE FUNCTION document_search_trigger();

-- Drop old index if exists
DROP INDEX IF EXISTS "document_ocrtext_idx";
DROP INDEX IF EXISTS "Document_searchVector_idx";

-- Create a generic GIN index on searchVector
CREATE INDEX "Document_searchVector_idx" ON "Document" USING GIN ("searchVector");

-- Manually update all existing documents to populate the searchVector
UPDATE "Document" SET "searchVector" = 
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') || 
  setweight(to_tsvector('simple', coalesce("markdownContent", coalesce("ocrText", ''))), 'B');