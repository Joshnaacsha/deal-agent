import { useState, useRef, useEffect } from "react";
import { Send, Upload, FileText, Bot, User } from "lucide-react";

export default function App() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:3001/upload", {
        method: "POST",
        body: formData,
      });
      
      setUploadedFile(file.name);
      const result = await res.json();

setMessages([
  {
    role: "ai",
    content: `📄 Document "${file.name}" has been uploaded successfully! Here's a quick summary:`
  },
  {
    role: "ai",
    content: result.summary || "No summary found."
  }
]);

    } catch (error) {
      setMessages([{
        role: "ai",
        content: "❌ Failed to upload document. Please try again."
      }]);
    }
  };

  const handleAsk = async () => {
  if (!question.trim()) return;

  const currentHistory = [
    ...messages,
    { role: "user" as const, content: question }
  ];
  setMessages(currentHistory);
  const currentQuestion = question;
  setQuestion("");
  setLoading(true);

  try {
    let aiMessage = "";
    let didWebScrape = false;  // ← track whether we’ve fallen back once
    const res = await fetch("http://localhost:3001/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: currentQuestion, chatHistory: currentHistory }),
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder("utf-8");

    // Add an empty AI message that we’ll update
    setMessages(prev => [...prev, { role: "ai", content: "" }]);

    while (true) {
      const { value, done } = await reader!.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk
        .split("\n")
        .filter(line => line.trim().startsWith("data:"));

      for (const line of lines) {
        const token = line.replace(/^data:\s*/, "");
        if (token === "[DONE]") {
        // Ignore the [DONE] marker and wait for stream end
        continue;
      } 
        aiMessage += token;

        // Update the last AI message with streaming content
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: "ai", content: aiMessage };
          return newMessages;
        });
      }

      // If we broke out on the second DONE:
    }
  } catch (error) {
    setMessages(prev => [
      ...prev,
      { role: "ai", content: "❌ Sorry, I encountered an error. Please try again." },
    ]);
  } finally {
    setLoading(false);
  }
};

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const styles = {
    container: {
      height: '100vh',
      background: 'linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%)',
      display: 'flex',
      flexDirection: 'column' as const,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      backgroundColor: 'white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      borderBottom: '1px solid #e5e7eb',
      padding: '16px 24px'
    },
    headerContent: {
      maxWidth: '1024px',
      margin: '0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    avatar: {
      width: '40px',
      height: '40px',
      background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    headerText: {
      margin: 0
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#111827',
      margin: 0
    },
    subtitle: {
      fontSize: '14px',
      color: '#6b7280',
      margin: 0
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    fileIndicator: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      backgroundColor: '#f0fdf4',
      color: '#166534',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '14px'
    },
    uploadButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'background-color 0.2s'
    },
    chatContainer: {
      flex: 1,
      overflow: 'hidden'
    },
    chatWrapper: {
      height: '100%',
      maxWidth: '1024px',
      margin: '0 auto',
      padding: '16px 24px'
    },
    chatBox: {
      height: '100%',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column' as const
    },
    messagesArea: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '16px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px'
    },
    welcomeScreen: {
      textAlign: 'center' as const,
      color: '#6b7280',
      marginTop: '80px'
    },
    welcomeTitle: {
      fontSize: '18px',
      fontWeight: '500',
      color: '#374151',
      margin: '16px 0 8px 0'
    },
    welcomeText: {
      fontSize: '14px',
      maxWidth: '400px',
      margin: '0 auto',
      lineHeight: '1.5'
    },
    messageRow: {
      display: 'flex'
    },
    messageRowUser: {
      justifyContent: 'flex-end'
    },
    messageRowAi: {
      justifyContent: 'flex-start'
    },
    messageContainer: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      maxWidth: '80%'
    },
    messageContainerUser: {
      flexDirection: 'row-reverse' as const
    },
    messageAvatar: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    },
    messageAvatarUser: {
      backgroundColor: '#3b82f6',
      color: 'white'
    },
    messageAvatarAi: {
      backgroundColor: '#f3f4f6',
      color: '#6b7280'
    },
    messageBubble: {
      padding: '12px 16px',
      borderRadius: '18px',
      fontSize: '14px',
      lineHeight: '1.5'
    },
    messageBubbleUser: {
      backgroundColor: '#3b82f6',
      color: 'white',
      borderBottomRightRadius: '6px'
    },
    messageBubbleAi: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      borderBottomLeftRadius: '6px'
    },
    loadingDots: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    dotContainer: {
      display: 'flex',
      gap: '4px'
    },
    dot: {
      width: '8px',
      height: '8px',
      backgroundColor: '#9ca3af',
      borderRadius: '50%',
      animation: 'bounce 1.4s infinite ease-in-out'
    },
    inputArea: {
      borderTop: '1px solid #e5e7eb',
      padding: '16px'
    },
    inputContainer: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: '12px'
    },
    textarea: {
      flex: 1,
      padding: '12px 16px',
      border: '1px solid #d1d5db',
      borderRadius: '24px',
      resize: 'none' as const,
      outline: 'none',
      fontSize: '14px',
      minHeight: '48px',
      maxHeight: '120px',
      fontFamily: 'inherit'
    },
    sendButton: {
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      padding: '12px',
      borderRadius: '50%',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      transition: 'background-color 0.2s'
    },
    sendButtonDisabled: {
      backgroundColor: '#d1d5db',
      cursor: 'not-allowed'
    },
    helperText: {
      fontSize: '12px',
      color: '#6b7280',
      textAlign: 'center' as const,
      marginTop: '8px'
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <div style={styles.avatar}>
              <Bot size={24} style={{ color: 'white' }} />
            </div>
            <div style={styles.headerText}>
              <h1 style={styles.title}>Deal Agent</h1>
              <p style={styles.subtitle}>Your AI-powered document assistant</p>
            </div>
          </div>
          
          <div style={styles.headerRight}>
            {uploadedFile && (
              <div style={styles.fileIndicator}>
                <FileText size={16} />
                <span style={{ maxWidth: '128px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {uploadedFile}
                </span>
              </div>
            )}
            <button
              style={styles.uploadButton}
              onClick={() => fileInputRef.current?.click()}
              onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#2563eb'}
              onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#3b82f6'}
            >
              <Upload size={16} />
              <span>Upload PDF</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleUpload}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div style={styles.chatContainer}>
        <div style={styles.chatWrapper}>
          <div style={styles.chatBox}>
            <div style={styles.messagesArea}>
              {messages.length === 0 && (
                <div style={styles.welcomeScreen}>
                  <Bot size={64} style={{ color: '#d1d5db', margin: '0 auto 16px' }} />
                  <h3 style={styles.welcomeTitle}>Welcome to Deal Agent!</h3>
                  <p style={styles.welcomeText}>
                    Upload a PDF document and start asking questions about it. I'll help you understand contracts, agreements, and other legal documents.
                  </p>
                </div>
              )}
              
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.messageRow,
                    ...(msg.role === "user" ? styles.messageRowUser : styles.messageRowAi)
                  }}
                >
                  <div style={{
                    ...styles.messageContainer,
                    ...(msg.role === "user" ? styles.messageContainerUser : {})
                  }}>
                    <div style={{
                      ...styles.messageAvatar,
                      ...(msg.role === "user" ? styles.messageAvatarUser : styles.messageAvatarAi)
                    }}>
                      {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div style={{
                      ...styles.messageBubble,
                      ...(msg.role === "user" ? styles.messageBubbleUser : styles.messageBubbleAi)
                    }}>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {loading && (
                <div style={styles.messageRowAi}>
                  <div style={styles.messageContainer}>
                    <div style={{ ...styles.messageAvatar, ...styles.messageAvatarAi }}>
                      <Bot size={16} />
                    </div>
                    <div style={{ ...styles.messageBubble, ...styles.messageBubbleAi }}>
                      <div style={styles.loadingDots}>
                        <div style={styles.dotContainer}>
                          <div style={{ ...styles.dot, animationDelay: '0ms' }}></div>
                          <div style={{ ...styles.dot, animationDelay: '150ms' }}></div>
                          <div style={{ ...styles.dot, animationDelay: '300ms' }}></div>
                        </div>
                        <span style={{ color: '#6b7280' }}>Thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={styles.inputArea}>
              <div style={styles.inputContainer}>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a question about your document..."
                  style={styles.textarea}
                  rows={1}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                  onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                />
                <button
                  onClick={handleAsk}
                  disabled={loading || question.trim() === "" || !uploadedFile}
                  style={{
                    ...styles.sendButton,
                    ...(loading || question.trim() === "" || !uploadedFile ? styles.sendButtonDisabled : {})
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && question.trim() !== "" && uploadedFile) {
                      (e.target as HTMLElement).style.backgroundColor = '#2563eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading && question.trim() !== "" && uploadedFile) {
                      (e.target as HTMLElement).style.backgroundColor = '#3b82f6';
                    }
                  }}
                >
                  <Send size={20} />
                </button>
              </div>
              {!uploadedFile && (
                <p style={styles.helperText}>
                  Please upload a PDF document first to start asking questions
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}