import { useEffect, useState, useCallback } from "react";
import { Music, Plus, Loader2, Trash2, Search, Upload, PlayCircle, FileAudio, ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { MasterDetailShell } from "@/components/common/MasterDetailShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getStoredUser } from "@/services/storage/storageService";
import {
  callDeleteAudioEndpoint,
  callListAudiosEndpoint,
  callUploadAudioEndpoint,
  condenseListAudiosResponse,
} from "@/services/audio/audioService";
import { AudioItem } from "@/types/audio";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function AudioLibrary() {
  const user = getStoredUser();
  const { toast } = useToast();

  // State
  const [audios, setAudios] = useState<AudioItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"empty" | "upload" | "detail">("empty");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Upload Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadTranscript, setUploadTranscript] = useState("");
  const [uploading, setUploading] = useState(false);

  // Filtered List
  const filteredAudios = audios.filter((a) =>
    a.audio_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedAudio = audios.find(a => a.audio_id === selectedId);

  const fetchAudios = useCallback(async () => {
    if (!user?.user_id) return;
    setListLoading(true);
    try {
      const { ok, json } = await callListAudiosEndpoint({ userId: user.user_id, page: 1, limit: 50 });
      const node = json as { data?: { audios?: AudioItem[] }; message?: string };
      if (ok && node.data?.audios) {
        setAudios(condenseListAudiosResponse(json));
      } else {
        toast({ variant: "destructive", title: "Error", description: node.message || "Failed to load audio files." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to load audios" });
    } finally {
      setListLoading(false);
    }
  }, [user?.user_id, toast]);

  useEffect(() => {
    fetchAudios();
  }, [fetchAudios]);

  const handleCreateNew = () => {
    setSelectedId(null);
    setUploadFile(null);
    setUploadName("");
    setUploadTranscript("");
    setMode("upload");
    setMobileDetailOpen(true);
  };

  const handleSelectAudio = (id: string) => {
    setSelectedId(id);
    setMode("detail");
    setMobileDetailOpen(true);
  };

  const handleDeleteAudio = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user?.user_id || !window.confirm("Are you sure you want to delete this audio?")) return;

    setDeletingId(id);
    try {
      const { ok, json } = await callDeleteAudioEndpoint({ userId: user.user_id, audioId: id });
      
      if (!ok) throw new Error((json as { message?: string })?.message || "Failed to delete");
      
      toast({ title: "Deleted", description: "Audio deleted successfully." });
      if (selectedId === id) {
        setMode("empty");
        setSelectedId(null);
        setMobileDetailOpen(false);
      }
      fetchAudios();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.user_id) return;
    if (!uploadFile) return toast({ variant: "destructive", title: "Missing File", description: "Please select an audio file to upload." });
    if (!uploadName) return toast({ variant: "destructive", title: "Missing Name", description: "Please enter a name for the audio." });

    setUploading(true);
    const formData = new FormData();
    formData.append("user_id", user.user_id);
    formData.append("file", uploadFile);
    formData.append("audio_name", uploadName);
    if (uploadTranscript) formData.append("transcript", uploadTranscript);

    try {
      const { ok, json } = await callUploadAudioEndpoint(formData);
      
      if (!ok) throw new Error((json as { message?: string })?.message || "Upload failed");

      toast({ title: "Success", description: "Audio uploaded successfully." });
      setMode("empty");
      setMobileDetailOpen(false);
      fetchAudios();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload Error", description: error.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <MasterDetailShell
      mobileDetailOpen={mobileDetailOpen}
      className="h-screen overflow-hidden"
      listClassName="animate-in slide-in-from-left h-full"
      detailClassName="bg-background h-full"
      list={
        <>
        <div className="p-4 border-b flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            <span className="font-semibold">Audio Library</span>
          </div>
          <Button size="sm" onClick={handleCreateNew} className="h-8 px-2 bg-primary">
            <Plus className="h-4 w-4 mr-1" /> Upload
          </Button>
        </div>

        <div className="p-4 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search audio..."
              className="pl-8 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {listLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filteredAudios.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">No audio files found.</div>
            ) : (
              filteredAudios.map((item) => (
                <div
                  key={item.audio_id}
                  onClick={() => handleSelectAudio(item.audio_id)}
                  className={cn(
                    "group flex items-start gap-3 p-3 rounded-md cursor-pointer transition-all border",
                    selectedId === item.audio_id ? "bg-accent/50 border-primary/50" : "bg-transparent border-transparent hover:bg-accent/30"
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", selectedId === item.audio_id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    <FileAudio className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={cn("text-sm font-medium truncate", selectedId === item.audio_id ? "text-primary" : "")}>
                      {item.audio_name}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">{item.duration_seconds ? `${item.duration_seconds}s` : "Unknown duration"}</p>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeleteAudio(item.audio_id, e)}
                    disabled={deletingId === item.audio_id}
                  >
                    {deletingId === item.audio_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        </>
      }
      detail={
        <>
        {mode === "empty" ? (
          <EmptyState
            icon={Music}
            title="No Audio Selected"
            description='Select an audio file from the sidebar or click "Upload" to add a new one.'
            descriptionClassName="max-w-md"
          />
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="p-4 md:p-6 border-b flex items-center justify-between bg-card/20 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="lg:hidden -ml-2 text-muted-foreground" onClick={() => setMobileDetailOpen(false)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <h2 className="text-xl font-bold">{mode === "upload" ? "Upload New Audio" : selectedAudio?.audio_name}</h2>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4 md:p-8">
              <div className="max-w-2xl mx-auto">
                {mode === "upload" ? (
                  <form onSubmit={handleUploadSubmit} className="space-y-6">
                    <div className="grid gap-2">
                      <Label>Audio File *</Label>
                      <Input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="cursor-pointer file:bg-muted file:text-muted-foreground file:border-0 file:mr-4 file:px-4 file:py-1 file:rounded-md hover:file:bg-muted/80"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Audio Name *</Label>
                      <Input value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="e.g. Welcome Greeting" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Transcript (Optional)</Label>
                      <Textarea value={uploadTranscript} onChange={(e) => setUploadTranscript(e.target.value)} placeholder="Type the spoken text here..." className="min-h-[100px]" />
                    </div>
                    <Button type="submit" disabled={uploading} className="w-full">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                      Upload Audio
                    </Button>
                  </form>
                ) : selectedAudio ? (
                  <div className="space-y-8">
                    <div className="p-6 bg-card border rounded-xl shadow-sm text-center space-y-4">
                      <PlayCircle className="h-16 w-16 mx-auto text-primary opacity-80" />
                      <div>
                        <h3 className="text-lg font-semibold">{selectedAudio.audio_name}</h3>
                        <p className="text-sm text-muted-foreground">ID: {selectedAudio.audio_id}</p>
                      </div>
                      
                      {selectedAudio.s3_url ? (
                         <audio controls src={selectedAudio.s3_url} className="w-full mt-4 outline-none" />
                      ) : (
                         <div className="p-4 bg-muted/50 rounded-md text-sm text-muted-foreground">Audio URL not available</div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-base">Transcript</Label>
                      <div className="p-4 bg-muted/30 rounded-xl border text-sm leading-relaxed">
                        {selectedAudio.transcript || <span className="italic text-muted-foreground">No transcript provided.</span>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="p-4 border rounded-xl bg-card/50">
                        <Label className="text-xs text-muted-foreground">Filename</Label>
                        <p className="font-medium mt-1 truncate" title={selectedAudio.filename}>{selectedAudio.filename || "N/A"}</p>
                      </div>
                      <div className="p-4 border rounded-xl bg-card/50">
                        <Label className="text-xs text-muted-foreground">Duration</Label>
                        <p className="font-medium mt-1">{selectedAudio.duration_seconds ? `${selectedAudio.duration_seconds} seconds` : "N/A"}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          </div>
        )}
        </>
      }
    />
  );
}