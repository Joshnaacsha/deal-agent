import { useState, useRef, useEffect } from "react";
import { Send, Upload, FileText, Bot, User, MessageCircle, Loader } from "lucide-react";

export default function App() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string; followups?: string[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawText, setRawText] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fixed function to format markdown content to HTML - more precise follow-up removal
  const formatMarkdown = (content: string) => {
    // More precise removal of follow-up questions section
    // Only remove if it's at the very end and clearly a follow-up section
    let cleanContent = content;
    
    // Remove follow-up sections that appear at the end of the content
    cleanContent = cleanContent.replace(/\n\n(Suggested )?[Ff]ollow-up [Qq]uestions?:\s*\n[\s\S]*$/m, '');
    cleanContent = cleanContent.replace(/\n\n(Here are some )?[Ff]ollow-up [Qq]uestions?[\s\S]*$/m, '');
    
    // Basic markdown formatting
    let formatted = cleanContent
      // Headers
      .replace(/^### (.*$)/gim, '<h3 style="font-size: 16px; font-weight: 600; margin: 16px 0 8px 0; color: #1f2937;">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 style="font-size: 18px; font-weight: 600; margin: 20px 0 10px 0; color: #1f2937;">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 style="font-size: 20px; font-weight: 600; margin: 24px 0 12px 0; color: #1f2937;">$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600; color: #374151;">$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>')
      // Lists
      .replace(/^\* (.*$)/gim, '<li style="margin: 4px 0; padding-left: 8px;">$1</li>')
      .replace(/^- (.*$)/gim, '<li style="margin: 4px 0; padding-left: 8px;">$1</li>')
      // Line breaks
      .replace(/\n/g, '<br>');

    // Wrap lists in ul tags
    formatted = formatted.replace(/(<li[^>]*>.*?<\/li>(?:\s*<br>\s*<li[^>]*>.*?<\/li>)*)/gs, 
      '<ul style="margin: 8px 0; padding-left: 20px; list-style-type: disc;">$1</ul>');

    // Clean up extra breaks around lists
    formatted = formatted.replace(/<br>\s*<ul/g, '<ul').replace(/<\/ul>\s*<br>/g, '</ul>');

    return formatted;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    // Add uploading message
    setMessages([{
      role: "ai",
      content: `📤 Analysing "${file.name}"... Please wait.`
    }]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("https://deal-agent-backend.onrender.com/upload", {
        method: "POST",
        body: formData,
      });
      
      const result = await res.json();
      setUploadedFile(file.name);
      setRawText(result.rawText);

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
    } finally {
      setUploading(false);
    }
  };

  const handleAsk = async (questionText?: string) => {
    const currentQuestion = questionText || question;
    if (!currentQuestion.trim()) return;

    const currentHistory = [
      ...messages,
      { role: "user" as const, content: currentQuestion }
    ];
    setMessages(currentHistory);
    setQuestion("");
    setLoading(true);

    try {
      let aiMessage = "";
      let followups: string[] = [];
      let buffer = ""; // Buffer for incomplete JSON chunks
      
      const res = await fetch("https://deal-agent-backend.onrender.com/rag-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: currentQuestion,
          chatHistory: [],
          rawText
        })
      });

      if (!res.body) {
        throw new Error("Response body is null");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      // Add an empty AI message that we'll update
      setMessages(prev => [...prev, { role: "ai", content: "" }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process complete lines from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data:')) continue;
          
          const jsonStr = line.replace(/^data:\s*/, "").trim();
          if (jsonStr === "[DONE]") {
            continue;
          }
          
          try {
            const parsed = JSON.parse(jsonStr);

            if (parsed.token) {
              aiMessage += parsed.token;
              // Update the message immediately - but don't format during streaming
              setMessages(prev => {
                const newMessages = [...prev];
                if (newMessages.length > 0) {
                  newMessages[newMessages.length - 1] = { 
                    role: "ai", 
                    content: aiMessage 
                  };
                }
                return newMessages;
              });
            }

            if (parsed.final && parsed.followups) {
              followups = parsed.followups;
            }
          } catch (e) {
            // Log the error for debugging but continue processing
            console.warn("Failed to parse JSON chunk:", jsonStr, e);
            continue;
          }
        }
      }

      // Process any remaining data in buffer
      if (buffer.trim()) {
        const lines = buffer.split('\n').filter(line => line.trim() && line.startsWith('data:'));
        for (const line of lines) {
          const jsonStr = line.replace(/^data:\s*/, "").trim();
          if (jsonStr === "[DONE]") continue;
          
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.token) {
              aiMessage += parsed.token;
            }
            if (parsed.final && parsed.followups) {
              followups = parsed.followups;
            }
          } catch (e) {
            console.warn("Failed to parse remaining JSON:", jsonStr, e);
          }
        }
      }

      // Final update with follow-ups
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages.length > 0) {
          newMessages[newMessages.length - 1] = { 
            role: "ai", 
            content: aiMessage,
            followups: followups.length > 0 ? followups : undefined
          };
        }
        return newMessages;
      });

    } catch (error) {
      console.error("Error in handleAsk:", error);
      setMessages(prev => [
        ...prev,
        { role: "ai", content: "❌ Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUpClick = (followupQuestion: string) => {
    handleAsk(followupQuestion);
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
      background: 'linear-gradient(135deg, #fafbfc 0%, #f3f4f6 50%, #e5e7eb 100%)',
      display: 'flex',
      flexDirection: 'column' as const,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    },
    header: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(229, 231, 235, 0.8)',
      padding: '20px 32px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
    },
    headerContent: {
      maxWidth: '100%',
      margin: '0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    avatar: {
      width: '48px',
      height: '48px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
    },
    headerText: {
      margin: 0
    },
    title: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#111827',
      margin: 0,
      letterSpacing: '-0.025em'
    },
    subtitle: {
      fontSize: '15px',
      color: '#6b7280',
      margin: '2px 0 0 0',
      fontWeight: '500'
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    fileIndicator: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      backgroundColor: '#ecfdf5',
      color: '#065f46',
      padding: '8px 16px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '500',
      border: '1px solid #a7f3d0'
    },
    uploadButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      background: uploading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      padding: '12px 20px',
      borderRadius: '12px',
      cursor: uploading ? 'not-allowed' : 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.2s ease',
      boxShadow: uploading ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.3)'
    },
    chatContainer: {
      flex: 1,
      overflow: 'hidden',
      padding: '24px 32px'
    },
    chatWrapper: {
      height: '100%',
      maxWidth: '100%',
      margin: '0 auto'
    },
    chatBox: {
      height: '100%',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '20px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
      border: '1px solid rgba(229, 231, 235, 0.5)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column' as const,
      backdropFilter: 'blur(12px)'
    },
    messagesArea: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '32px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '24px'
    },
    welcomeScreen: {
      textAlign: 'center' as const,
      color: '#6b7280',
      marginTop: '120px'
    },
    welcomeTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#374151',
      margin: '20px 0 12px 0',
      letterSpacing: '-0.025em'
    },
    welcomeText: {
      fontSize: '15px',
      maxWidth: '480px',
      margin: '0 auto',
      lineHeight: '1.6',
      color: '#6b7280'
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
      gap: '12px',
      maxWidth: '85%'
    },
    messageContainerUser: {
      flexDirection: 'row-reverse' as const
    },
    messageColumn: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '12px'
    },
    messageAvatar: {
      width: '36px',
      height: '36px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    },
    messageAvatarUser: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
    },
    messageAvatarAi: {
      backgroundColor: '#f9fafb',
      color: '#6b7280',
      border: '1px solid #e5e7eb'
    },
    messageBubble: {
      padding: '16px 20px',
      borderRadius: '20px',
      fontSize: '15px',
      lineHeight: '1.6',
      fontWeight: '400'
    },
    messageBubbleUser: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      borderBottomRightRadius: '8px',
      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
    },
    messageBubbleAi: {
      backgroundColor: '#f9fafb',
      color: '#374151',
      borderBottomLeftRadius: '8px',
      border: '1px solid #e5e7eb'
    },
    followupsContainer: {
      marginTop: '12px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px'
    },
    followupButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '12px 16px',
      fontSize: '14px',
      color: '#374151',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      textAlign: 'left' as const,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: '500',
      backdropFilter: 'blur(8px)'
    },
    loadingDots: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
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
      borderTop: '1px solid rgba(229, 231, 235, 0.5)',
      padding: '24px 32px',
      backgroundColor: 'rgba(249, 250, 251, 0.5)',
      backdropFilter: 'blur(8px)'
    },
    inputContainer: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: '16px'
    },
    textarea: {
      flex: 1,
      padding: '16px 20px',
      border: '1px solid #e5e7eb',
      borderRadius: '16px',
      resize: 'none' as const,
      outline: 'none',
      fontSize: '15px',
      minHeight: '56px',
      maxHeight: '120px',
      fontFamily: 'inherit',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      transition: 'all 0.2s ease',
      backdropFilter: 'blur(8px)'
    },
    sendButton: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      padding: '14px',
      borderRadius: '14px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      transition: 'all 0.2s ease',
      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
    },
    sendButtonDisabled: {
      background: '#e5e7eb',
      cursor: 'not-allowed',
      boxShadow: 'none'
    },
    helperText: {
      fontSize: '13px',
      color: '#9ca3af',
      textAlign: 'center' as const,
      marginTop: '12px',
      fontWeight: '500'
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
              <p style={styles.subtitle}>Your AI-powered RFx assistant</p>
            </div>
          </div>
          
          <div style={styles.headerRight}>
            {uploadedFile && (
              <div style={styles.fileIndicator}>
                <FileText size={16} />
                <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {uploadedFile}
                </span>
              </div>
            )}
            <button
              style={styles.uploadButton}
              onClick={() => !uploading && fileInputRef.current?.click()}
              disabled={uploading}
              onMouseEnter={(e) => !uploading && ((e.target as HTMLElement).style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => !uploading && ((e.target as HTMLElement).style.transform = 'translateY(0)')}
            >
              {uploading ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
              <span>{uploading ? 'Analysing...' : 'Upload RFx'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleUpload}
              style={{ display: 'none' }}
              disabled={uploading}
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
                  <Bot size={80} style={{ color: '#d1d5db', margin: '0 auto 20px' }} />
                  <h3 style={styles.welcomeTitle}>Welcome to Deal Agent!</h3>
                  <p style={styles.welcomeText}>
                    I'll help you understand RFx documents with intelligent analysis and insights.
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
                      {msg.role === "user" ? <User size={18} /> : <Bot size={18} />}
                    </div>
                    <div style={styles.messageColumn}>
                      <div style={{
                        ...styles.messageBubble,
                        ...(msg.role === "user" ? styles.messageBubbleUser : styles.messageBubbleAi)
                      }}>
                        {msg.role === "ai" ? (
                          <div dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }} />
                        ) : (
                          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                        )}
                      </div>
                      
                      {/* Follow-up questions - Only show as clickable buttons */}
                      {msg.role === "ai" && msg.followups && msg.followups.length > 0 && (
                        <div style={styles.followupsContainer}>
                          {msg.followups.map((followup, index) => (
                            <button
                              key={index}
                              style={styles.followupButton}
                              onClick={() => handleFollowUpClick(followup)}
                              onMouseEnter={(e) => {
                                (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 1)';
                                (e.target as HTMLElement).style.borderColor = '#667eea';
                                (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                                (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                              }}
                              onMouseLeave={(e) => {
                                (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                                (e.target as HTMLElement).style.borderColor = '#e5e7eb';
                                (e.target as HTMLElement).style.transform = 'translateY(0)';
                                (e.target as HTMLElement).style.boxShadow = 'none';
                              }}
                            >
                              <MessageCircle size={14} />
                              {followup}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {loading && (
                <div style={styles.messageRowAi}>
                  <div style={styles.messageContainer}>
                    <div style={{ ...styles.messageAvatar, ...styles.messageAvatarAi }}>
                      <Bot size={18} />
                    </div>
                    <div style={{ ...styles.messageBubble, ...styles.messageBubbleAi }}>
                      <div style={styles.loadingDots}>
                        <div style={styles.dotContainer}>
                          <div style={{ ...styles.dot, animationDelay: '0ms' }}></div>
                          <div style={{ ...styles.dot, animationDelay: '150ms' }}></div>
                          <div style={{ ...styles.dot, animationDelay: '300ms' }}></div>
                        </div>
                        <span style={{ color: '#6b7280', fontWeight: '500' }}>Analyzing...</span>
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
                  onFocus={(e) => {
                    (e.target.style.borderColor = '#667eea');
                    (e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)');
                  }}
                  onBlur={(e) => {
                    (e.target.style.borderColor = '#e5e7eb');
                    (e.target.style.boxShadow = 'none');
                  }}
                />
                <button
                  onClick={() => handleAsk()}
                  disabled={loading || question.trim() === "" || !uploadedFile}
                  style={{
                    ...styles.sendButton,
                    ...(loading || question.trim() === "" || !uploadedFile ? styles.sendButtonDisabled : {})
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && question.trim() !== "" && uploadedFile) {
                      (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading && question.trim() !== "" && uploadedFile) {
                      (e.target as HTMLElement).style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <Send size={20} />
                </button>
              </div>
              {!uploadedFile && (
                <p style={styles.helperText}>
                  Please upload a RFx document first to start asking questions
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
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.5);
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.8);
        }
      `}</style>
    </div>
  );
}
