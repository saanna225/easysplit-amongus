import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReceiptUploaderProps {
  billId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ReceiptUploader = ({ billId, onSuccess, onCancel }: ReceiptUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload to storage with user ID in path
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${billId}-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("receipts")
        .getPublicUrl(fileName);

      // Update bill with image URL
      const { error: updateError } = await supabase
        .from("bills")
        .update({ receipt_image_url: publicUrl })
        .eq("id", billId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Receipt uploaded successfully",
      });

      // Extract text from image
      setExtracting(true);
      const { data: extractData, error: extractError } = await supabase.functions.invoke(
        "extract-receipt-text",
        { body: { imageUrl: publicUrl } }
      );

      if (extractError) {
        console.error("OCR error:", extractError);
        toast({
          title: "Info",
          description: "Receipt uploaded but text extraction failed. You can add items manually.",
        });
      } else if (extractData?.text) {
        // Save extracted text
        await supabase
          .from("bills")
          .update({ raw_ocr_text: extractData.text })
          .eq("id", billId);

        // Parse and create items
        await parseAndCreateItems(extractData.text, billId);

        toast({
          title: "Success",
          description: "Items extracted from receipt",
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "Failed to upload receipt",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setExtracting(false);
    }
  };

  const parseAndCreateItems = async (text: string, billId: string) => {
    const lines = text.split("\n");
    const items = [];

    for (const line of lines) {
      // Look for pattern: ITEM_NAME | PRICE
      const match = line.match(/^(.+?)\s*\|\s*\$?(\d+\.?\d*)/);
      if (match) {
        const description = match[1].trim();
        const price = parseFloat(match[2]);
        if (description && !isNaN(price) && price > 0) {
          items.push({ bill_id: billId, description, price });
        }
      }
    }

    if (items.length > 0) {
      await supabase.from("items").insert(items);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Upload Receipt</h3>
      <div className="space-y-4">
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading || extracting}
            className="hidden"
            id="receipt-upload"
          />
          <label
            htmlFor="receipt-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            {uploading || extracting ? (
              <>
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">
                  {uploading ? "Uploading..." : "Extracting text..."}
                </p>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-primary" />
                <p className="font-medium">Click to upload receipt</p>
                <p className="text-sm text-muted-foreground">JPG, PNG, or other image format</p>
              </>
            )}
          </label>
        </div>

        <Button variant="outline" onClick={onCancel} disabled={uploading || extracting} className="w-full">
          Cancel
        </Button>
      </div>
    </Card>
  );
};
