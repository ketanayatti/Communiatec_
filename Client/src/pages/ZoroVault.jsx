import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";
import UserShareDialog from "@/components/vault/UserShareDialog";
import SharedFilesPanel from "@/components/vault/SharedFilesPanel";
import DeleteDialog from "@/components/vault/DeleteDialog";
import VaultStats from "@/components/vault/VaultStats";
import UploadArea from "@/components/vault/UploadArea";
import VaultControls from "@/components/vault/VaultControls";
import FileGrid from "@/components/vault/FileGrid";
import FileList from "@/components/vault/FileList";
import VaultEmptyState from "@/components/vault/VaultEmptyState";
import VaultFooter from "@/components/vault/VaultFooter";
import { Shield } from "lucide-react";
import { Share } from "lucide-react";

const ZoroVault = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [filterType, setFilterType] = useState("all");
  const [dragActive, setDragActive] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    fileId: null,
    fileName: "",
  });
  const [shareDialog, setShareDialog] = useState({
    isOpen: false,
    fileId: null,
    fileName: "",
  });
  const [sharedFilesPanel, setSharedFilesPanel] = useState(false);
  const [sharedFilesCount, setSharedFilesCount] = useState(0);
  const inputRef = useRef();

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/api/zoro");
      setFiles(res.data.files || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const fetchSharedFilesCount = async () => {
    try {
      const res = await apiClient.get("/api/zoro/shared/received");
      setSharedFilesCount(res.data.sharedFiles?.length || 0);
    } catch (err) {
      console.error("Failed to fetch shared files count:", err);
    }
  };

  useEffect(() => {
    fetchFiles();
    fetchSharedFilesCount();

    const handleSharedFileReceived = () => {
      fetchSharedFilesCount();
      toast.info("You've received a new shared file", {
        icon: <Share className="w-4 h-4 text-indigo-400" />,
      });
    };

    const handleOpenSharedFilesPanel = () => {
      setSharedFilesPanel(true);
    };

    window.addEventListener(
      "vaultFileSharedReceived",
      handleSharedFileReceived
    );
    window.addEventListener("openSharedFilesPanel", handleOpenSharedFilesPanel);

    return () => {
      window.removeEventListener(
        "vaultFileSharedReceived",
        handleSharedFileReceived
      );
      window.removeEventListener(
        "openSharedFilesPanel",
        handleOpenSharedFilesPanel
      );
    };
  }, []);

  const handleUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return;

    const formData = new FormData();
    for (const file of fileList) {
      formData.append("files", file);
    }

    try {
      setUploading(true);
      await apiClient.post("/api/zoro/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchFiles();
      toast.success(
        `${fileList.length} file${
          fileList.length > 1 ? "s" : ""
        } uploaded successfully`
      );

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e) => {
    handleUpload(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const openDeleteDialog = (id, filename) => {
    setDeleteDialog({ isOpen: true, fileId: id, fileName: filename });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ isOpen: false, fileId: null, fileName: "" });
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/api/zoro/${deleteDialog.fileId}`);
      setFiles(files.filter((f) => f._id !== deleteDialog.fileId));
      toast.success(`"${deleteDialog.fileName}" deleted successfully`);
      closeDeleteDialog();
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
      closeDeleteDialog();
    }
  };

  const handleDownload = async (id) => {
    try {
      const fileInfoResponse = await apiClient.get(`/api/zoro/${id}/download`);
      const originalFilename = fileInfoResponse.data.filename;

      const response = await apiClient.get(`/api/zoro/${id}/download`, {
        params: { stream: "true" },
        responseType: "blob",
        headers: { Accept: "application/octet-stream" },
      });

      let filename = originalFilename;
      const contentDisposition = response.headers["content-disposition"];
      const xOriginalFilename = response.headers["x-original-filename"];

      if (xOriginalFilename) {
        filename = decodeURIComponent(xOriginalFilename);
      } else if (contentDisposition) {
        const filenameStarMatch = contentDisposition.match(
          /filename\*=UTF-8''([^;]+)/
        );
        const filenameMatch = contentDisposition.match(
          /filename="?([^"\\s;]+)"?/
        );
        if (filenameStarMatch) {
          filename = decodeURIComponent(filenameStarMatch[1]);
        } else if (filenameMatch) {
          filename = filenameMatch[1].replace(/[\"']/g, "");
        }
      }

      const contentType =
        response.headers["content-type"] ||
        fileInfoResponse.data.mimeType ||
        "application/octet-stream";

      const blob = new Blob([response.data], { type: contentType });
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
      toast.success(`Downloaded ${filename} successfully!`);
    } catch (err) {
      console.error("Download error:", err);
      try {
        const res = await apiClient.get(`/api/zoro/${id}/download`);
        const downloadUrl = res.data.url;
        const filename = res.data.filename;

        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Downloaded ${filename} successfully!`);
      } catch (fallbackErr) {
        console.error("Fallback download error:", fallbackErr);
        toast.error("Download failed. Please try again.");
      }
    }
  };

  const openShareDialog = (id, filename) => {
    setShareDialog({ isOpen: true, fileId: id, fileName: filename });
  };

  const closeShareDialog = () => {
    setShareDialog({ isOpen: false, fileId: null, fileName: "" });
  };

  const handleShare = async (recipientEmail, message) => {
    try {
      await apiClient.post(`/api/zoro/${shareDialog.fileId}/share`, {
        recipientEmail,
        message,
      });
      toast.success(`File shared successfully with ${recipientEmail}`);
      closeShareDialog();
    } catch (err) {
      console.error("Share failed:", err);
      const errorMessage =
        err.response?.data?.message || "Failed to share file";
      toast.error(errorMessage);
      throw err;
    }
  };

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.filename
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterType === "all" ||
      (filterType === "images" && file.mimeType.startsWith("image/")) ||
      (filterType === "documents" &&
        (file.mimeType.includes("pdf") ||
          file.mimeType.includes("document") ||
          file.mimeType.includes("presentation") ||
          file.mimeType.includes("sheet"))) ||
      (filterType === "archives" &&
        (file.mimeType.includes("zip") || file.mimeType.includes("rar")));
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center p-8">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-1 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-cyan-400 mb-2">
            Initializing Vault
          </h2>
          <p className="text-slate-400 text-sm">
            Securing your digital assets...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 relative z-10">
        <div className="mb-8">
          <VaultStats
            filesCount={files.length}
            sharedFilesCount={sharedFilesCount}
            onOpenSharedPanel={() => setSharedFilesPanel(true)}
          />

          <UploadArea
            dragActive={dragActive}
            uploading={uploading}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onFileInputChange={handleFileInputChange}
            fileInputRef={inputRef}
            onUploadClick={() => inputRef.current?.click()}
          />
        </div>

        <VaultControls
          searchTerm={searchTerm}
          onSearchChange={(e) => setSearchTerm(e.target.value)}
          filterType={filterType}
          onFilterChange={(e) => setFilterType(e.target.value)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <div>
          {filteredFiles.length === 0 ? (
            <VaultEmptyState
              searchTerm={searchTerm}
              filterType={filterType}
              onUploadClick={() => inputRef.current?.click()}
            />
          ) : viewMode === "grid" ? (
            <FileGrid
              files={filteredFiles}
              onDownload={handleDownload}
              onShare={(id, filename) => openShareDialog(id, filename)}
              onDelete={(id, filename) => openDeleteDialog(id, filename)}
            />
          ) : (
            <FileList
              files={filteredFiles}
              onDownload={handleDownload}
              onShare={(id, filename) => openShareDialog(id, filename)}
              onDelete={(id, filename) => openDeleteDialog(id, filename)}
            />
          )}
        </div>

        <VaultFooter />
      </div>

      {/* Dialogs */}
      <DeleteDialog
        isOpen={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        onConfirm={handleDelete}
        fileName={deleteDialog.fileName}
      />
      <UserShareDialog
        isOpen={shareDialog.isOpen}
        onClose={closeShareDialog}
        onShare={handleShare}
        fileName={shareDialog.fileName}
      />
      <SharedFilesPanel
        isOpen={sharedFilesPanel}
        onClose={() => {
          setSharedFilesPanel(false);
          setTimeout(fetchSharedFilesCount, 300);
        }}
        onFileProcessed={fetchSharedFilesCount}
      />
    </div>
  );
};

export default ZoroVault;
