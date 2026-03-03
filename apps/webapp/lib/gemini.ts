import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

export const buildExtractionPrompt = () => `
You are an expert legal document analyst and data extraction engine.
Analyze the provided page image from a legal/commercial document.
Extract the structured data and output strictly valid XML.
Follow these guidelines:
1. Use semantic tags like <Document>, <Article>, <Section>, <Paragraph>, <Heading>, <Signature>, <Date>, <Entity>.
2. Do not include any markdown formatting (like \`\`\`xml). Output ONLY the raw XML string.
3. Ensure the XML is well-formed. Use a root <Page> element if necessary.
4. Extract all text accurately. If there are tables, try to represent them with <Table>, <Row>, <Cell>.
5. Do not invent information. If text is illegible, leave it blank or omit the tag.
`;
