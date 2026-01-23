import { useState, useEffect, useRef } from "react";
import { FileText, Plus, Trash2, Edit2, Save, X, Loader2, Upload, File as FileIcon } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import {
  getDocuments,
  saveDocument,
  updateDocument,
  deleteDocument,
  type Document,
} from "@/services/documentService";
import { getOpenAIApiKey } from "@/config/apiKey";

export function DocumentManager() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExtractingPDF, setIsExtractingPDF] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = () => {
    const docs = getDocuments();
    setDocuments(docs);
  };

  const handleOpenDialog = (doc?: Document) => {
    if (doc) {
      setEditingDoc(doc);
      setTitle(doc.title);
      setContent(doc.content);
    } else {
      setEditingDoc(null);
      setTitle("");
      setContent("");
    }
    setError(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDoc(null);
    setTitle("");
    setContent("");
    setError(null);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (editingDoc) {
        updateDocument(editingDoc.id, { title: title.trim(), content: content.trim() });
      } else {
        saveDocument({ title: title.trim(), content: content.trim() });
      }
      
      loadDocuments();
      handleCloseDialog();
    } catch (err: any) {
      setError(err.message || "Failed to save document");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this document?")) {
      deleteDocument(id);
      loadDocuments();
    }
  };

  // Extract text from PDF file
  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      // Dynamically import pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set worker source (required for pdfjs)
      if (typeof window !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      }
      
      return fullText.trim();
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      throw new Error('Failed to extract text from PDF. Make sure the file is a valid PDF.');
    }
  };

  const handleFileUpload = async (event: { target: { files: FileList | null } }) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('PDF file is too large. Maximum size is 10MB.');
      return;
    }

    setIsExtractingPDF(true);
    setError(null);
    setUploadedFileName(file.name);

    try {
      const extractedText = await extractTextFromPDF(file);
      
      // Auto-fill title and content
      const fileNameWithoutExt = file.name.replace(/\.pdf$/i, '');
      setTitle(fileNameWithoutExt);
      setContent(extractedText);
      
      // Open dialog if not already open
      if (!isDialogOpen) {
        setIsDialogOpen(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to extract text from PDF');
      setUploadedFileName(null);
    } finally {
      setIsExtractingPDF(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const apiKey = getOpenAIApiKey();
  const hasApiKey = !!apiKey;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-4 h-4" />
              Knowledge Base Documents
            </CardTitle>
            <CardDescription className="mt-1">
              Add documents to provide context for AI recommendations. Documents are analyzed using RAG (Retrieval Augmented Generation).
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="pdf-upload"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isExtractingPDF}
            >
              {isExtractingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload PDF
                </>
              )}
            </Button>
            <Button onClick={() => handleOpenDialog()} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Text
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasApiKey && (
          <Alert className="mb-4">
            <AlertDescription className="text-sm">
              <strong>Note:</strong> To enable semantic search (embeddings), add your OpenAI API key in Settings. 
              Without it, documents will use keyword-based search.
            </AlertDescription>
          </Alert>
        )}

        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No documents yet. Add your first document to get started.</p>
            <p className="text-xs mt-2">
              Documents can include course materials, personal notes, goals, or any context you want the AI to consider.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{doc.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {doc.content.substring(0, 150)}
                    {doc.content.length > 150 ? "..." : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {doc.embedding ? "✓ Embedded" : "Not embedded"} • Updated{" "}
                    {new Date(doc.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenDialog(doc)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDoc ? "Edit Document" : "Add New Document"}
              </DialogTitle>
              <DialogDescription>
                Add a document that will be used as context for AI recommendations. 
                The AI will retrieve relevant information from your documents when generating suggestions.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {uploadedFileName && (
                <Alert>
                  <FileIcon className="w-4 h-4" />
                  <AlertDescription className="text-sm">
                    PDF uploaded: <strong>{uploadedFileName}</strong>. Text extracted and ready to save.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="doc-title">Title</Label>
                <Input
                  id="doc-title"
                  placeholder="e.g., Course Syllabus, Personal Goals, Study Notes"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="doc-content">Content</Label>
                <Textarea
                  id="doc-content"
                  placeholder="Enter the document content here. This will be analyzed and used to provide context-aware recommendations..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {content.length} characters
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleCloseDialog} disabled={isSaving}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving || !title.trim() || !content.trim()}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {editingDoc ? "Update" : "Save"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
