import { useEffect, useState, useRef, ChangeEvent } from "react";
import { useParams, useNavigate } from "@/lib/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, MessageCircle, Send, Paperclip, X } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";

import { useAuthStore } from "@/hooks/useStore";
import { useRealtimeMessages } from "@/hooks/useRealtime";
import { getMessages, sendMessage } from "@/lib/api";
import type { Message } from "@/types";
import { SmoothInput } from "@/components/ui/smooth-input";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export default function Chat() {
  const { rideId } = useParams<{ rideId: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sendError,setSendError]=useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const newMsg = useRealtimeMessages(rideId || "");

  useEffect(() => {
    let cancelled=false;
    setMessages([]);setSendError('');
    async function load() {
      if (!rideId) return;
      try {
        const history=await getMessages(rideId);
        if(!cancelled)setMessages(prev=>[...history,...prev.filter(message=>!history.some(item=>item.id===message.id))]);
      } catch (e) {
        console.error(e);
      }
    }
    load();
    return()=>{cancelled=true;};
  }, [rideId]);

  useEffect(() => {
    if (newMsg?.ride_id===rideId) setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
  }, [newMsg,rideId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (quick?:string) => {
    if (!user || !rideId || sending) return;
    const content=quick||text.trim();
    if (!content && !file) return;
    setSending(true);
    setSendError('');
    try {
      let attachmentUrl;
      if (file) {
        setUploading(true);
        const ext = file.name.split(".").pop() || "jpg";
        const path = `chat/${rideId}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("attachments").upload(path, file);
        if(error)throw error;
        const { data } = supabase.storage.from("attachments").getPublicUrl(path);
        attachmentUrl = data.publicUrl;
        setUploading(false);
      }
      const msg = await sendMessage({ ride_id: rideId, sender_id: user.id, message: content, attachment_url: attachmentUrl });
      setMessages((prev) => prev.some(item=>item.id===msg.id)?prev:[...prev, msg]);
      setText("");
      setFile(null);
    } catch (e) {
      console.error(e);
      setSendError('Message could not be sent. Please retry.');
      setUploading(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white/40" style={{ height: "calc(100dvh - 64px)" }}>
      <div className="mx-auto flex h-full max-w-2xl flex-col">
        {/* header */}
        <div className="flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="grid size-9 place-items-center rounded-xl bg-muted text-foreground transition-colors hover:bg-muted2"
          >
            <ArrowLeft className="size-5" />
          </button>
          <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent-strong">
            <MessageCircle className="size-5" />
          </span>
          <div>
            <h2 className="font-display font-bold text-foreground">Ride chat</h2>
            <p className="text-xs text-muted-foreground">Real-time messaging</p>
          </div>
        </div>

        {/* messages */}
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-muted/30 p-4">
          {messages.length === 0 && (
            <div className="py-16 text-center text-muted-foreground">
              <MessageCircle className="mx-auto mb-3 size-10 opacity-20" />
              <p className="text-sm">No messages yet</p>
              <p className="mt-1 text-xs">Start the conversation!</p>
            </div>
          )}
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn("flex", isMe ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[78%] px-4 py-2.5 text-sm shadow-sm",
                    isMe
                      ? "rounded-[16px_16px_4px_16px] bg-primary text-primary-foreground"
                      : "rounded-[16px_16px_16px_4px] border border-border bg-card text-foreground",
                  )}
                >
                  {msg.attachment_url && (
                    <img src={msg.attachment_url} alt="attachment" className="mb-2 max-h-48 rounded-lg object-cover" />
                  )}
                  {msg.message && <p className="whitespace-pre-wrap break-words">{msg.message}</p>}
                  <p className={cn("mt-1 text-right text-[10px]", isMe ? "text-white/70" : "text-muted-foreground")}>
                    {format(new Date(msg.created_at), "h:mm a")}
                  </p>
                </div>
              </motion.div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* composer */}
        {file && (
          <div className="flex items-center gap-2 border-t border-border bg-muted/50 p-3">
            <div className="relative overflow-hidden rounded-lg border border-border bg-background">
              <img src={URL.createObjectURL(file)} alt="upload preview" className="h-16 w-16 object-cover" />
              <button
                type="button"
                onClick={() => setFile(null)}
                className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <X className="size-3" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Image attached</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2 border-t border-border bg-card p-3">
          {['I’m at the gate','Please wait 2 minutes','I can’t find you'].map(message=><button key={message} disabled={sending} onClick={()=>void handleSend(message)} className="rounded-full border border-border px-3 py-1.5 text-xs">{message}</button>)}
          {sendError&&<p role="alert" className="w-full text-xs text-danger">{sendError}</p>}
        </div>
        <div className="flex items-center gap-2 border-t border-border bg-background/95 p-3 backdrop-blur">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const f = e.target.files?.[0];
              if (f) setFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground transition-colors hover:bg-accent-soft hover:text-accent-strong"
          >
            <Paperclip className="size-4" />
          </button>
          <SmoothInput
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message…"
            wrapperClassName="flex-1"
            aria-label="Chat message"
          />
          <Button size="md" onClick={()=>void handleSend()} disabled={(!text.trim() && !file) || sending || uploading} loading={sending || uploading} aria-label="Send" className="!px-3.5">
            {!(sending || uploading) && <Send className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
