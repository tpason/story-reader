"use client";

import { animate } from "animejs";
import { ChevronDown, CornerDownRight, LoaderCircle, MessageCircle, UserPlus } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchCurrentUser } from "@/lib/api-client";
import { avatarGradient, avatarInitial } from "@/lib/identity";
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
  const gradient = avatarGradient(author.username);
  return (
    <span
      className="comment-avatar"
      data-realm={author.cultivation.realmImageKey}
      style={{ "--avatar-from": gradient.from, "--avatar-to": gradient.to } as React.CSSProperties}
      title={`${author.cultivation.realm} tầng ${author.cultivation.realmStage}`}
    >
      {avatarInitial(author.username)}
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

function commentAuraStyle(author: CommentAuthor) {
  const level = Math.max(1, author.cultivation.level);
  const glow = Math.min(0.34, 0.08 + level * 0.012);
  const speed = Math.max(4.6, 9.5 - level * 0.18);
  return {
    "--comment-glow": glow.toFixed(2),
    "--comment-border-speed": `${speed.toFixed(1)}s`
  } as React.CSSProperties;
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
    if (!isOpen) return;

    setLoading(true);
    fetch(`/api/chapters/${chapterId}/comments`)
      .then((response) => response.json() as Promise<CommentsResponse>)
      .then((data) => {
        setComments(data.items ?? []);
        setReplies(data.replies ?? []);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [chapterId, isOpen]);

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
  }, [chapterId]);

  function addComment(comment: ChapterComment) {
    setLastCreatedId(comment.id);
    if (comment.parentId) {
      setReplies((current) => [...current, comment]);
    } else {
      setComments((current) => [...current, comment]);
    }
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
          <span className="comments-count">{comments.length + replies.length}</span>
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
        {comments.map((comment) => (
          <article className="comment-thread" key={comment.id} data-comment-thread>
            <div className="comment-item" data-comment-id={comment.id}>
              <CommentAvatar author={comment.author} />
              <div className="comment-body" data-realm={comment.author.cultivation.realmImageKey} style={commentAuraStyle(comment.author)}>
                <div className="comment-meta">
                  <strong>{comment.author.username}</strong>
                  <RealmChip author={comment.author} />
                </div>
                <CommentText text={comment.contentText} />
                <div className="comment-actions">
                  <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString("vi-VN")}</time>
                  {user ? (
                    <button type="button" onClick={() => setReplyingTo((current) => (current === comment.id ? null : comment.id))}>
                      <CornerDownRight size={14} />
                      Hồi đáp
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {(repliesByParent.get(comment.id) ?? []).map((reply) => (
              <div className="comment-item comment-reply" key={reply.id} data-comment-id={reply.id}>
                <CommentAvatar author={reply.author} />
                <div className="comment-body" data-realm={reply.author.cultivation.realmImageKey} style={commentAuraStyle(reply.author)}>
                  <div className="comment-meta">
                    <strong>{reply.author.username}</strong>
                    <RealmChip author={reply.author} />
                  </div>
                  <CommentText text={reply.contentText} />
                  <div className="comment-actions">
                    <time dateTime={reply.createdAt}>{new Date(reply.createdAt).toLocaleString("vi-VN")}</time>
                  </div>
                </div>
              </div>
            ))}

            {replyingTo === comment.id ? (
              <div className="comment-reply-form">
                <CommentForm chapterId={chapterId} parentId={comment.id} onCreated={addComment} onCancel={() => setReplyingTo(null)} autoFocus />
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  </section>
);
}
