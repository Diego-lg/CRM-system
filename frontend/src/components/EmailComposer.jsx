import React, { useState } from "react";
import { X, Send, Paperclip, ChevronDown } from "lucide-react";
import Modal from "./Modal";
import { emailService } from "../lib/emailService";
import useCRM from "../store/useCRM";

export default function EmailComposer({
  open,
  onClose,
  contact = null,
  company = null,
  prefillSubject = "",
  prefillBody = "",
}) {
  const user = useCRM((s) => s.user);
  const contacts = useCRM((s) => s.contacts);
  const companies = useCRM((s) => s.companies);

  const [to, setTo] = useState(contact?.email || company?.email || "");
  const [subject, setSubject] = useState(prefillSubject);
  const [body, setBody] = useState(prefillBody);
  const [sending, setSending] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [cc, setCc] = useState("");
  const [attachments, setAttachments] = useState([]);

  const handleSend = async () => {
    if (!to || !subject) return;

    setSending(true);
    try {
      const { data, error } = await emailService.send({
        contactId: contact?.id || null,
        companyId: company?.id || null,
        fromAddress: user?.email || "demo@crm.local",
        toAddress: to,
        subject,
        body,
        attachments,
      });

      if (error) throw error;

      // Trigger notification
      if (window.NotificationContext) {
        window.NotificationContext.addNotification({
          type: "email_sent",
          title: "Email Sent",
          message: `Email sent to ${to}`,
          link_to: `/activities`,
        });
      }

      onClose();
      resetForm();
    } catch (err) {
      console.error("Failed to send email:", err);
      alert("Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setTo("");
    setSubject("");
    setBody("");
    setCc("");
    setAttachments([]);
  };

  const handleAttach = (e) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = files.map((file) => ({
      filename: file.name,
      url: URL.createObjectURL(file),
      file_size: file.size,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Modal open={open} onClose={onClose} title="Compose Email" size="lg">
      <div className="space-y-4">
        {/* To Field */}
        <div>
          <label className="label">To *</label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="input"
            placeholder="recipient@example.com"
          />
        </div>

        {/* CC Toggle */}
        <button
          type="button"
          onClick={() => setShowCc(!showCc)}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <ChevronDown size={14} />
          CC/BCC
        </button>

        {/* CC Field */}
        {showCc && (
          <div>
            <label className="label">CC</label>
            <input
              type="email"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              className="input"
              placeholder="cc@example.com"
            />
          </div>
        )}

        {/* Subject */}
        <div>
          <label className="label">Subject *</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="input"
            placeholder="Email subject"
          />
        </div>

        {/* Body */}
        <div>
          <label className="label">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="input min-h-[200px]"
            placeholder="Write your message here..."
          />
        </div>

        {/* Attachments */}
        <div>
          <label className="label">Attachments</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm"
              >
                <Paperclip size={14} className="text-gray-400" />
                <span className="truncate max-w-[150px]">{file.filename}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <Paperclip size={16} />
            Add Attachment
            <input
              type="file"
              multiple
              onChange={handleAttach}
              className="hidden"
            />
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!to || !subject || sending}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              "Sending..."
            ) : (
              <>
                <Send size={16} />
                Send Email
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
