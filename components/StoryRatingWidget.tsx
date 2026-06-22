"use client";

import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppSelector } from "@/lib/store-hooks";

type RatingData = {
  avgRating: number | null;
  totalRatings: number;
  userRating: { rating: number; reviewText: string | null } | null;
};

type Props = {
  storyId: string;
  compact?: boolean;
};

export function StoryRatingWidget({ storyId, compact = false }: Props) {
  const user = useAppSelector((s) => s.identity.user);
  const identityHydrated = useAppSelector((s) => s.identity.hydrated);
  const [data, setData] = useState<RatingData | null>(null);
  const [hovered, setHovered] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/stories/${storyId}/rating`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (d.userRating?.reviewText) setReviewText(d.userRating.reviewText);
      })
      .catch(() => undefined);
  }, [storyId]);

  async function submitRating(rating: number) {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/stories/${storyId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, reviewText: reviewText || null })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Lỗi");
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setSaving(false);
    }
  }

  async function removeRating() {
    if (!user) return;
    setSaving(true);
    try {
      await fetch(`/api/stories/${storyId}/rating`, { method: "DELETE" });
      const fresh = await fetch(`/api/stories/${storyId}/rating`).then((r) => r.json()).catch(() => null);
      if (fresh) {
        setData(fresh);
      } else {
        setData((prev) => prev ? { ...prev, userRating: null } : prev);
      }
      setReviewText("");
    } finally {
      setSaving(false);
    }
  }

  const displayRating = hovered || data?.userRating?.rating || 0;
  const avgFormatted = data?.avgRating != null ? data.avgRating.toFixed(1) : null;

  return (
    <section className={`story-rating-widget${compact ? " story-rating-widget-compact" : ""}`} aria-label="Đánh giá truyện">
      <div className="story-rating-header">
        <span className="story-rating-aggregate">
          {avgFormatted ? (
            <>
              <Star size={14} fill="currentColor" className="story-rating-star-fill" />
              <strong>{avgFormatted}</strong>
              <span className="story-rating-count">({data?.totalRatings ?? 0} đánh giá)</span>
            </>
          ) : (
            <span className="story-rating-count">Chưa có đánh giá</span>
          )}
        </span>
        {data?.userRating ? (
          <button className="story-rating-remove" type="button" onClick={removeRating} disabled={saving}>
            Xoá đánh giá
          </button>
        ) : null}
      </div>

      {identityHydrated && user ? (
        <div className="story-rating-stars" aria-label="Chọn sao đánh giá">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`story-rating-star${displayRating >= star ? " story-rating-star-active" : ""}`}
              aria-label={`${star} sao`}
              disabled={saving}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => {
                if (data?.userRating?.rating === star) {
                  setShowReview((v) => !v);
                } else {
                  submitRating(star);
                }
              }}
            >
              <Star size={22} fill={displayRating >= star ? "currentColor" : "none"} />
            </button>
          ))}
          {data?.userRating ? (
            <button
              type="button"
              className="story-rating-review-toggle"
              onClick={() => setShowReview((v) => !v)}
            >
              {showReview ? "Đóng bình chú" : data.userRating.reviewText ? "Sửa bình chú" : "Thêm bình chú"}
            </button>
          ) : null}
        </div>
      ) : identityHydrated && !user ? (
        <p className="story-rating-login-hint">Đăng nhập để đánh giá truyện này</p>
      ) : null}

      {showReview && data?.userRating ? (
        <div className="story-rating-review-form">
          <textarea
            className="story-rating-review-input"
            placeholder="Bình chú ngắn về truyện... (tùy chọn)"
            value={reviewText}
            maxLength={2000}
            rows={3}
            onChange={(e) => setReviewText(e.target.value)}
          />
          <div className="story-rating-review-actions">
            <button
              type="button"
              className="auth-submit"
              disabled={saving}
              onClick={() => submitRating(data.userRating!.rating)}
            >
              Lưu bình chú
            </button>
            <button type="button" className="chip" onClick={() => setShowReview(false)}>
              Đóng
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="story-rating-error">{error}</p> : null}
    </section>
  );
}
