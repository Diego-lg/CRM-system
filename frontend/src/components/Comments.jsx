import React, { useState, useEffect } from "react";
import {
  MessageCircle,
  Send,
  Reply,
  Trash2,
  MoreVertical,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { supabase, DEMO_MODE, getCurrentUser } from "../lib/supabase";
import useCRM from "../store/useCRM";

const DEMO_COMMENTS_KEY = "crm_comments";

const getDemoComments = () => {
  try {
    const stored = localStorage.getItem(DEMO_COMMENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

const saveDemoComments = (comments) => {
  try {
    localStorage.setItem(DEMO_COMMENTS_KEY, JSON.stringify(comments));
  } catch (e) {
    console.error("Failed to save comments:", e);
  }
};

export default function Comments({ entityType, entityId }) {
  const user = useCRM((s) => s.user);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [expandedReplies, setExpandedReplies] = useState({});

  useEffect(() => {
    loadComments();
  }, [entityType, entityId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      if (DEMO_MODE) {
        const allComments = getDemoComments();
        const entityComments = allComments.filter(
          (c) => c.entity_type === entityType && c.entity_id === entityId,
        );
        setComments(entityComments);
      } else {
        const { data, error } = await supabase
          .from("comments")
          .select("*")
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .order("created_at", { ascending: true });

        if (!error) {
          setComments(data || []);
        }
      }
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      if (DEMO_MODE) {
        const newCommentObj = {
          id: `comment_${Date.now()}`,
          entity_type: entityType,
          entity_id: entityId,
          parent_comment_id: null,
          content: newComment,
          created_by: user?.id || "demo-user",
          created_at: new Date().toISOString(),
          user_name: user?.name || "Demo User",
          user_avatar: user?.avatar || "DU",
        };
        const allComments = getDemoComments();
        saveDemoComments([...allComments, newCommentObj]);
        setComments([...comments, newCommentObj]);
      } else {
        const { data: authUser } = await getCurrentUser();
        const { data, error } = await supabase
          .from("comments")
          .insert({
            entity_type: entityType,
            entity_id: entityId,
            content: newComment,
            created_by: authUser?.id,
          })
          .select()
          .single();

        if (!error && data) {
          setComments([...comments, data]);
        }
      }

      setNewComment("");
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handleReply = async (parentId) => {
    if (!replyContent.trim()) return;

    try {
      if (DEMO_MODE) {
        const replyObj = {
          id: `comment_${Date.now()}`,
          entity_type: entityType,
          entity_id: entityId,
          parent_comment_id: parentId,
          content: replyContent,
          created_by: user?.id || "demo-user",
          created_at: new Date().toISOString(),
          user_name: user?.name || "Demo User",
          user_avatar: user?.avatar || "DU",
        };
        const allComments = getDemoComments();
        saveDemoComments([...allComments, replyObj]);
        setComments([...comments, replyObj]);
      } else {
        const { data: authUser } = await getCurrentUser();
        const { data, error } = await supabase
          .from("comments")
          .insert({
            entity_type: entityType,
            entity_id: entityId,
            parent_comment_id: parentId,
            content: replyContent,
            created_by: authUser?.id,
          })
          .select()
          .single();

        if (!error && data) {
          setComments([...comments, data]);
        }
      }

      setReplyContent("");
      setReplyingTo(null);
    } catch (err) {
      console.error("Failed to add reply:", err);
    }
  };

  const handleDelete = async (commentId) => {
    if (!confirm("Delete this comment?")) return;

    try {
      if (DEMO_MODE) {
        const allComments = getDemoComments();
        saveDemoComments(allComments.filter((c) => c.id !== commentId));
        setComments(comments.filter((c) => c.id !== commentId));
      } else {
        const { error } = await supabase
          .from("comments")
          .delete()
          .eq("id", commentId);

        if (!error) {
          setComments(comments.filter((c) => c.id !== commentId));
        }
      }
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  const toggleReplies = (commentId) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  // Get top-level comments and their replies
  const topLevelComments = comments.filter((c) => !c.parent_comment_id);
  const getReplies = (parentId) =>
    comments.filter((c) => c.parent_comment_id === parentId);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const renderComment = (comment, isReply = false) => {
    const replies = getReplies(comment.id);
    const hasReplies = replies.length > 0;
    const isExpanded = expandedReplies[comment.id];

    return (
      <div key={comment.id} className={`${isReply ? "ml-8 mt-2" : ""}`}>
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-700">
            {comment.user_avatar ||
              comment.created_by?.slice(0, 2).toUpperCase() ||
              "?"}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">
                {comment.user_name || "User"}
              </span>
              <span className="text-xs text-gray-400">
                {formatTime(comment.created_at)}
              </span>
            </div>
            <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">
              {comment.content}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-1">
              {!isReply && (
                <button
                  onClick={() =>
                    setReplyingTo(replyingTo === comment.id ? null : comment.id)
                  }
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  <Reply size={12} />
                  Reply
                </button>
              )}
              {comment.created_by === user?.id && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="text-xs text-gray-400 hover:text-red-600 flex items-center gap-1"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>

            {/* Reply Input */}
            {replyingTo === comment.id && (
              <div className="mt-2 flex items-start gap-2">
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleReply(comment.id);
                    }
                  }}
                />
                <button
                  onClick={() => handleReply(comment.id)}
                  disabled={!replyContent.trim()}
                  className="p-2 bg-gray-900 text-white rounded-lg disabled:opacity-50"
                >
                  <Send size={14} />
                </button>
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent("");
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Replies */}
        {hasReplies && !isReply && (
          <div className="mt-2">
            <button
              onClick={() => toggleReplies(comment.id)}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 ml-11"
            >
              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </button>

            {isExpanded && (
              <div className="mt-2 space-y-2">
                {replies.map((reply) => renderComment(reply, true))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageCircle size={18} className="text-gray-600" />
        <h4 className="font-semibold text-gray-900">
          Comments ({topLevelComments.length})
        </h4>
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmitComment} className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-700">
          {user?.avatar || user?.name?.slice(0, 2).toUpperCase() || "ME"}
        </div>
        <div className="flex-1">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            rows={2}
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="btn-primary text-sm disabled:opacity-50"
            >
              <Send size={14} />
              Post Comment
            </button>
          </div>
        </div>
      </form>

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No comments yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Be the first to add a comment
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {topLevelComments.map((comment) => renderComment(comment))}
        </div>
      )}
    </div>
  );
}
