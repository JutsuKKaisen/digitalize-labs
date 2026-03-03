-- 1. Create a GIN index on the searchVector column
CREATE INDEX IF NOT EXISTS "Document_searchVector_idx" ON "Document" USING GIN("searchVector");

-- 2. Create the function that will update searchVector based on ocrText
CREATE OR REPLACE FUNCTION document_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  -- We use 'simple' dictionary for standard tokenization without language-specific stemming
  NEW."searchVector" := to_tsvector('simple', coalesce(NEW."ocrText", ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- 3. Create a trigger that calls the function BEFORE INSERT or UPDATE on Document
DROP TRIGGER IF EXISTS document_search_vector_update ON "Document";
CREATE TRIGGER document_search_vector_update
  BEFORE INSERT OR UPDATE OF "ocrText" ON "Document"
  FOR EACH ROW
  EXECUTE FUNCTION document_search_vector_trigger();

-- 4. Pre-populate existing documents
UPDATE "Document" SET "searchVector" = to_tsvector('simple', coalesce("ocrText", ''));