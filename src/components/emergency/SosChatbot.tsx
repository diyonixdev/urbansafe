"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Send, Bot, User, AlertTriangle } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function SosChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "I am the UrbanSafe AI Emergency Assistant. How can I help you right now? (e.g. 'How to perform CPR', 'What to do in an earthquake')" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = input.trim();
    setInput("");
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages })
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const data = await response.json();
      const aiReply = data.choices?.[0]?.message?.content || "Sorry, I couldn't process that. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: aiReply }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Error connecting to AI service. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="em-chatbot-container">
      <div className="em-chatbot-header">
        <Bot size={18} />
        <h4>AI Emergency Guidance</h4>
      </div>
      
      <div className="em-chatbot-warning">
        <AlertTriangle size={14} />
        <span>Do not replace professional emergency services with AI. Call 100/108 in critical situations.</span>
      </div>

      <div className="em-chatbot-messages" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`em-chatbot-msg ${msg.role === "user" ? "user-msg" : "ai-msg"}`}>
            <div className="msg-icon">
              {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className="msg-content">{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="em-chatbot-msg ai-msg">
            <div className="msg-icon"><Bot size={14} /></div>
            <div className="msg-content"><Loader2 size={14} className="em-spin" /></div>
          </div>
        )}
      </div>

      <div className="em-chatbot-input">
        <input 
          type="text" 
          placeholder="Type your emergency query..." 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={loading}
        />
        <button type="button" onClick={handleSend} disabled={!input.trim() || loading}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
