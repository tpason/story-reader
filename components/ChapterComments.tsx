"use client";

import { animate } from "animejs";
import { ChevronDown, CornerDownRight, Flag, LoaderCircle, MessageCircle, Pencil, Trash2, UserPlus, UserX } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchCurrentUser } from "@/lib/api-client";
import {
  commentAuraVars,
  commentPrestigeLabel,
  commentPrestigeTier,
  cultivationAuraTier
} from "@/lib/cultivation";
import { CultivationAvatar } from "@/components/CultivationAvatar";
import { prefersReducedMotion } from "@/lib/browser";
import { SkillCaster } from "@/components/SkillCaster";
import type { SkillCastEvent } from "@/components/SkillEffectLayer";
import type { ChapterComment, CommentAuthor, CommentsResponse } from "@/components/comment-types";
import { setCurrentUser } from "@/lib/store";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";

const CommentForm = dynamic(
  () => import("@/components/CommentEditorForm").then((module) => module.CommentEditorForm),
  {
    ssr: false,
    loading: () => (
      <div className="comment-editor-loading">
        <LoaderCircle size={16} className="spin" />
        Đang mở khung luận đạo
      </div>
    )
  }
);

function CommentAvatar({ author }: { author: CommentAuthor }) {
  return (
    <CultivationAvatar
      username={author.username}
      level={author.cultivation.level}
      realmImageKey={author.cultivation.realmImageKey}
      size="md"
      isAdmin={Boolean(author.isAdmin)}
      className="comment-avatar-slot"
      title={`${author.cultivation.realm} tầng ${author.cultivation.realmStage}`}
    />
  );
}

function PrestigeBadge({ author }: { author: CommentAuthor }) {
  if (author.isAdmin) {
    return (
      <span className="comment-prestige-badge" data-prestige="admin">
        Tổng quản
      </span>
    );
  }

  const tier = commentPrestigeTier(author.cultivation.level);
  const label = commentPrestigeLabel(tier);
  if (!label) return null;

  return (
    <span className="comment-prestige-badge" data-prestige={tier}>
      {label}
    </span>
  );
}

function RealmChip({ author }: { author: CommentAuthor }) {
  return (
    <span className="comment-realm-chip" data-realm={author.cultivation.realmImageKey}>
      {author.cultivation.realm} · {author.cultivation.realmStage}
    </span>
  );
}

function commentBodyProps(author: CommentAuthor) {
  const prestige = author.isAdmin ? "grandmaster" : commentPrestigeTier(author.cultivation.level);
  return {
    prestige,
    auraTier: cultivationAuraTier(author.cultivation.level),
    style: commentAuraVars(author.cultivation.level)
  };
}

function CommentText({ text }: { text: string }) {
  const shouldClamp = text.trim().length > 280 || text.split(/\s+/).length > 58 || text.includes("\n");
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={shouldClamp ? "comment-text-wrap comment-text-wrap-clampable" : "comment-text-wrap"} data-expanded={expanded ? "true" : "false"}>
      <p className={shouldClamp && !expanded ? "comment-text comment-text-collapsed" : "comment-text"}>{text}</p>
      {shouldClamp ? (
        <button type="button" className="comment-read-toggle" onClick={() => setExpanded((current) => !current)} aria-expanded={expanded}>
          {expanded ? "Thu gọn" : "Đọc thêm"}
        </button>
      ) : null}
    </div>
  );
}

function CommentInlineEditor({
  chapterId,
  comment,
  onSaved,
  onCancel
}: {
  chapterId: string;
  comment: ChapterComment;
  onSaved: (comment: ChapterComment) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(comment.contentText);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/chapters/${chapterId}/comments/${comment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text })
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string; item?: ChapterComment };
    if (!response.ok || !data.item) {
      setError(data.error ?? "Không sửa được bình luận.");
      setSaving(false);
      return;
    }
    onSaved(data.item);
    setSaving(false);
  }

  return (
    <div className="comment-inline-editor">
      <textarea value={text} maxLength={1600} rows={4} onChange={(event) => setText(event.target.value)} />
      {error ? <p className="comment-inline-editor-error">{error}</p> : null}
      <div className="comment-inline-editor-actions">
        <button type="button" className="chip" disabled={saving} onClick={() => void save()}>
          {saving ? "Đang lưu…" : "Lưu"}
        </button>
        <button type="button" className="chip" onClick={onCancel}>
          Hủy
        </button>
      </div>
    </div>
  );
}

function CommentOwnerButtons({
  chapterId,
  comment,
  userId,
  isAdmin,
  onEdit,
  onDeleted
}: {
  chapterId: string;
  comment: ChapterComment;
  userId: string;
  isAdmin: boolean;
  onEdit: () => void;
  onDeleted: (comment: ChapterComment) => void;
}) {
  if (comment.deletedAt) return null;
  if (comment.userId !== userId && !isAdmin) return null;

  async function remove() {
    if (!window.confirm("Phong ấn bình luận này?")) return;
    const response = await fetch(`/api/chapters/${chapterId}/comments/${comment.id}`, { method: "DELETE" });
    const data = (await response.json().catch(() => ({}))) as { item?: ChapterComment };
    if (data.item) onDeleted(data.item);
  }

  return (
    <>
      <button type="button" onClick={onEdit}>
        <Pencil size={14} />
        Sửa
      </button>
      <button type="button" onClick={() => void remove()}>
        <Trash2 size={14} />
        Xóa
      </button>
    </>
  );
}

const REPORT_REASONS = [
  { value: "spam", label: "Spam / quảng cáo" },
  { value: "harassment", label: "Quấy rối / xúc phạm" },
  { value: "spoiler", label: "Spoiler" },
  { value: "inappropriate", label: "Nội dung không phù hợp" },
  { value: "other", label: "Khác" }
] as const;

function CommentModerationButtons({
  chapterId,
  comment,
  userId,
  onBlocked
}: {
  chapterId: string;
  comment: ChapterComment;
  userId: string;
  onBlocked: (blockedUserId: string) => void;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]["value"]>("inappropriate");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState<"report" | "block" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (comment.deletedAt || comment.userId === userId) return null;

  async function submitReport() {
    setBusy("report");
    setMessage(null);
    const response = await fetch(`/api/chapters/${chapterId}/comments/${comment.id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, details })
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setBusy(null);
    if (!response.ok) {
      setMessage(data.error ?? "Không gửi được báo cáo.");
      return;
    }
    setMessage("Đã gửi báo cáo. Tổng quản sẽ xem xét.");
    setReportOpen(false);
  }

  async function blockUser() {
    if (!window.confirm(`Phong ấn luận đạo từ ${comment.author.username}? Bạn sẽ không thấy bình luận của đạo hữu này.`)) {
      return;
    }
    setBusy("block");
    setMessage(null);
    const response = await fetch("/api/users/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: comment.userId })
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setBusy(null);
    if (!response.ok) {
      setMessage(data.error ?? "Không phong ấn được.");
      return;
    }
    onBlocked(comment.userId);
  }

  return (
    <>
      <button type="button" disabled={busy !== null} onClick={() => setReportOpen((open) => !open)}>
        <Flag size={14} />
        Báo cáo
      </button>
      <button type="button" disabled={busy !== null} onClick={() => void blockUser()}>
        <UserX size={14} />
        {busy === "block" ? "Đang phong ấn…" : "Phong ấn"}
      </button>
      {reportOpen ? (
        <div className="comment-report-form">
          <label>
            Lý do
            <select value={reason} onChange={(event) => setReason(event.target.value as typeof reason)}>
              {REPORT_REASONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Chi tiết (tuỳ chọn)
            <textarea
              value={details}
              maxLength={500}
              rows={2}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Mô tả ngắn nếu cần"
            />
          </label>
          <div className="comment-report-form-actions">
            <button type="button" className="chip" disabled={busy === "report"} onClick={() => void submitReport()}>
              {busy === "report" ? "Đang gửi…" : "Gửi báo cáo"}
            </button>
            <button type="button" className="chip" onClick={() => setReportOpen(false)}>
              Hủy
            </button>
          </div>
        </div>
      ) : null}
      {message ? <p className="comment-moderation-message">{message}</p> : null}
    </>
  );
}

export function ChapterComments({ chapterId }: { chapterId: string }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.identity.user);
  const [comments, setComments] = useState<ChapterComment[]>([]);
  const [replies, setReplies] = useState<ChapterComment[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const blockRef = useRef<HTMLElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);

  const repliesByParent = useMemo(() => {
    const map = new Map<string, ChapterComment[]>();
    replies.forEach((reply) => {
      if (!reply.parentId) return;
      map.set(reply.parentId, [...(map.get(reply.parentId) ?? []), reply]);
    });
    return map;
  }, [replies]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    if (prefersReducedMotion()) {
      content.style.display = isOpen ? "block" : "none";
      content.style.opacity = isOpen ? "1" : "0";
      return;
    }

    if (isOpen) {
      content.style.display = "block";
      content.style.overflow = "hidden";

      const height = content.scrollHeight;

      const animation = animate(content, {
        opacity: [0, 1],
        height: [0, height],
        y: [-8, 0],
        duration: 420,
        ease: "outExpo",
        complete: () => {
          content.style.height = "auto";
          content.style.overflow = "visible";
        }
      });

      return () => {
        animation.revert();
      };
    }

    content.style.overflow = "hidden";

    const animation = animate(content, {
      opacity: [1, 0],
      height: [content.scrollHeight, 0],
      y: [0, -8],
      duration: 300,
      ease: "inOutQuad",
      complete: () => {
        content.style.display = "none";
      }
    });

    return () => {
      animation.revert();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || loading) return;
    const list = listRef.current;
    if (!list) return;
    if (prefersReducedMotion()) return;

    const threads = Array.from(list.querySelectorAll<HTMLElement>("[data-comment-thread]"));
    if (threads.length === 0) return;

    threads.forEach((node) => {
      node.style.opacity = "0";
      node.style.transform = "translateY(10px)";
    });

    const animation = animate(threads, {
      opacity: [0, 1],
      translateY: [10, 0],
      delay: (_el: unknown, index: number) => index * 42,
      duration: 520,
      ease: "outExpo"
    });

    return () => {
      animation.revert();
      threads.forEach((node) => {
        node.style.opacity = "";
        node.style.transform = "";
      });
    };
  }, [isOpen, loading, comments.length, replies.length]);

  useEffect(() => {
    fetchCurrentUser()
      .then((currentUser) => {
        dispatch(setCurrentUser(currentUser));
      })
      .catch(() => undefined);
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;
    setComments([]);
    setReplies([]);
    setLoading(true);
    fetch(`/api/chapters/${chapterId}/comments`)
      .then((response) => response.json() as Promise<CommentsResponse>)
      .then((data) => {
        if (cancelled) return;
        setComments(data.items ?? []);
        setReplies(data.replies ?? []);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  useEffect(() => {
    const openComments = () => setIsOpen(true);
    window.addEventListener("reader:open-comments", openComments);
    return () => window.removeEventListener("reader:open-comments", openComments);
  }, []);

  useEffect(() => {
    const block = blockRef.current;
    if (!block || prefersReducedMotion()) return;

    const animation = animate(block, {
      opacity: [0, 1],
      y: [12, 0],
      duration: 520,
      ease: "outExpo"
    });

    return () => {
      animation.revert();
    };
  }, [chapterId]);

  useEffect(() => {
    setIsOpen(false);
    setReplyingTo(null);
    setLastCreatedId(null);
    setEditingCommentId(null);
  }, [chapterId]);

  function removeBlockedComments(blockedUserId: string) {
    setComments((current) => current.filter((item) => item.userId !== blockedUserId));
    setReplies((current) => current.filter((item) => item.userId !== blockedUserId));
  }

  function addComment(comment: ChapterComment) {
    setLastCreatedId(comment.id);
    if (comment.parentId) {
      setReplies((current) => [...current, comment]);
    } else {
      setComments((current) => [...current, comment]);
    }
  }

  function updateComment(comment: ChapterComment) {
    if (comment.parentId) {
      setReplies((current) => current.map((item) => (item.id === comment.id ? comment : item)));
    } else {
      setComments((current) => current.map((item) => (item.id === comment.id ? comment : item)));
    }
    setEditingCommentId(null);
  }

  useEffect(() => {
    if (!lastCreatedId) return;
    const list = listRef.current;
    if (!list) return;
    const node = list.querySelector<HTMLElement>(`[data-comment-id="${CSS.escape(lastCreatedId)}"]`);
    if (!node) return;

    if (!prefersReducedMotion()) {
      const animation = animate(node, {
        backgroundColor: ["rgba(245, 215, 94, 0.28)", "rgba(0, 0, 0, 0)"],
        duration: 1400,
        ease: "outQuad"
      });
      return () => {
        animation.revert();
      };
    }
  }, [lastCreatedId]);

  function playSkill(event: unknown) {
    window.dispatchEvent(new CustomEvent<SkillCastEvent>("reader-skill-cast", { detail: event as SkillCastEvent }));
  }

  const commentCount = comments.length + replies.length;

  return (
  <section className="chapter-comments" ref={blockRef} aria-label="Luận đạo chương này">
    <button
      type="button"
      className="comments-toggle"
      onClick={() => setIsOpen((current) => !current)}
      aria-expanded={isOpen}
      aria-controls="chapter-comments-content"
    >
      <div className="comments-heading">
        <div>
          <p className="eyebrow">Luận đạo</p>
          <h2>Luận đạo chương này</h2>
        </div>

        <div className="comments-toggle-meta">
          <span className="comments-count" aria-label={`${commentCount} bình luận`}>
            {loading && commentCount === 0 ? "…" : commentCount}
          </span>
          <ChevronDown className={isOpen ? "comments-chevron open" : "comments-chevron"} size={20} />
        </div>
      </div>
    </button>

    <div
      id="chapter-comments-content"
      ref={contentRef}
      className="comments-collapsible"
      style={{ display: "none", height: 0, opacity: 0, overflow: "hidden" }}
    >
      {user ? (
        <>
          <SkillCaster chapterId={chapterId} user={user} onCast={playSkill} />
          <CommentForm chapterId={chapterId} onCreated={addComment} />
        </>
      ) : (
        <div className="comment-login-note">
          <MessageCircle size={17} />
          <span>Tán tu có thể xem luận đạo. Hãy nhập môn để bình luận và hồi đáp.</span>
          <Link href="/signup">
            <UserPlus size={15} />
            Nhập môn
          </Link>
        </div>
      )}

      {loading ? (
        <div className="comments-loading">
          <LoaderCircle size={17} className="spin" />
          Đang tải đạo luận
        </div>
      ) : null}

      {!loading && comments.length === 0 ? <p className="comments-empty">Chưa có đạo hữu nào luận đạo ở chương này.</p> : null}

      <div className="comment-thread-list" ref={listRef}>
        {comments.map((comment) => {
          const commentBody = commentBodyProps(comment.author);
          return (
          <article className="comment-thread" key={comment.id} data-comment-thread>
            <div
              className="comment-item"
              data-comment-id={comment.id}
              data-prestige={commentBody.prestige}
            >
              <CommentAvatar author={comment.author} />
              <div
                className="comment-body"
                data-realm={comment.author.cultivation.realmImageKey}
                data-prestige={commentBody.prestige}
                data-aura-tier={commentBody.auraTier}
                style={commentBody.style}
              >
                <div className="comment-meta">
                  <strong>{comment.author.username}</strong>
                  <PrestigeBadge author={comment.author} />
                  <RealmChip author={comment.author} />
                </div>
                {editingCommentId === comment.id ? (
                  <CommentInlineEditor
                    chapterId={chapterId}
                    comment={comment}
                    onSaved={updateComment}
                    onCancel={() => setEditingCommentId(null)}
                  />
                ) : (
                  <>
                    <CommentText text={comment.contentText} />
                    <div className="comment-actions">
                      <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString("vi-VN")}</time>
                      {user ? (
                        <button type="button" onClick={() => setReplyingTo((current) => (current === comment.id ? null : comment.id))}>
                          <CornerDownRight size={14} />
                          Hồi đáp
                        </button>
                      ) : null}
                      {user ? (
                        <CommentModerationButtons
                          chapterId={chapterId}
                          comment={comment}
                          userId={user.id}
                          onBlocked={removeBlockedComments}
                        />
                      ) : null}
                      {user ? (
                        <CommentOwnerButtons
                          chapterId={chapterId}
                          comment={comment}
                          userId={user.id}
                          isAdmin={Boolean(user.isAdmin)}
                          onEdit={() => setEditingCommentId(comment.id)}
                          onDeleted={updateComment}
                        />
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </div>

            {(repliesByParent.get(comment.id) ?? []).map((reply) => {
              const replyBody = commentBodyProps(reply.author);
              return (
              <div
                className="comment-item comment-reply"
                key={reply.id}
                data-comment-id={reply.id}
                data-prestige={replyBody.prestige}
              >
                <CommentAvatar author={reply.author} />
                <div
                  className="comment-body"
                  data-realm={reply.author.cultivation.realmImageKey}
                  data-prestige={replyBody.prestige}
                  data-aura-tier={replyBody.auraTier}
                  style={replyBody.style}
                >
                  <div className="comment-meta">
                    <strong>{reply.author.username}</strong>
                    <PrestigeBadge author={reply.author} />
                    <RealmChip author={reply.author} />
                  </div>
                  {editingCommentId === reply.id ? (
                    <CommentInlineEditor
                      chapterId={chapterId}
                      comment={reply}
                      onSaved={updateComment}
                      onCancel={() => setEditingCommentId(null)}
                    />
                  ) : (
                    <>
                      <CommentText text={reply.contentText} />
                      <div className="comment-actions">
                        <time dateTime={reply.createdAt}>{new Date(reply.createdAt).toLocaleString("vi-VN")}</time>
                        {user ? (
                          <CommentModerationButtons
                            chapterId={chapterId}
                            comment={reply}
                            userId={user.id}
                            onBlocked={removeBlockedComments}
                          />
                        ) : null}
                        {user ? (
                          <CommentOwnerButtons
                            chapterId={chapterId}
                            comment={reply}
                            userId={user.id}
                            isAdmin={Boolean(user.isAdmin)}
                            onEdit={() => setEditingCommentId(reply.id)}
                            onDeleted={updateComment}
                          />
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
            })}

            {replyingTo === comment.id ? (
              <div className="comment-reply-form">
                <CommentForm chapterId={chapterId} parentId={comment.id} onCreated={addComment} onCancel={() => setReplyingTo(null)} autoFocus />
              </div>
            ) : null}
          </article>
        );
        })}
      </div>
    </div>
  </section>
);
}
