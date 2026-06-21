"use client";

import { Award, BellRing, BookOpenCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { getCultivationState } from "@/lib/cultivation";
import { visibleSkillsForAdmin } from "@/lib/skills";
import { storyHref } from "@/lib/urls";
import { useAppSelector } from "@/lib/store-hooks";

export function ProfileShelf() {
  const user = useAppSelector((state) => state.identity.user);
  const history = useAppSelector((state) => state.history.items);
  const follows = useAppSelector((state) => state.follows.items);
  const streak = useAppSelector((state) => state.readingStreak);
  const cultivation = getCultivationState(history, Boolean(user), streak.currentStreak, Boolean(user?.isAdmin));
  const unlockedSkills = visibleSkillsForAdmin(Boolean(user?.isAdmin)).filter((skill) => Boolean(user?.isAdmin) || cultivation.level >= skill.minLevel);
  const streakBase = Math.max(1, streak.currentStreak || history.filter((item) => Date.now() - Date.parse(item.lastReadAt) < 1000 * 60 * 60 * 24 * 7).length);

  return (
    <section className="profile-shelf" aria-label="Tủ truyện đạo hữu">
      <div className="profile-shelf-header">
        <div>
          <p className="eyebrow">{user?.isAdmin ? "Tủ truyện admin" : user ? "Tủ truyện" : "Tủ truyện guest"}</p>
          <h2>{cultivation.realm} tầng {cultivation.realmStage}</h2>
        </div>
        <div className="profile-role-stack">
          <span className={`role-badge role-badge-${user?.isAdmin ? "admin" : user ? "user" : "guest"}`}>
            {user?.isAdmin ? "Admin" : user ? "Đạo hữu" : "Guest"}
          </span>
          <span className="cultivation-level">Lv.{cultivation.level}</span>
        </div>
      </div>

      <div className="profile-stat-grid">
        <span>
          <BookOpenCheck size={16} />
          <strong>{cultivation.completedChapterCount}</strong>
          chương đã đọc
        </span>
        <span>
          <BellRing size={16} />
          <strong>{follows.length}</strong>
          truyện theo dõi
        </span>
        <span>
          <Award size={16} />
          <strong>{Math.max(1, streakBase)}</strong>
          ngày khí vận
        </span>
        <span>
          <Sparkles size={16} />
          <strong>{unlockedSkills.length}</strong>
          đạo pháp mở khóa
        </span>
      </div>

      {unlockedSkills.length > 0 ? (
        <div className="profile-badge-row" aria-label="Đạo pháp đã mở khóa">
          {unlockedSkills.map((skill) => (
            <span key={skill.id}>{skill.name}</span>
          ))}
        </div>
      ) : null}

      {follows.length > 0 ? (
        <div className="profile-follow-list">
          {follows.slice(0, 4).map((item) => (
            <Link href={storyHref({ id: item.storyId, title: item.storyTitle })} key={item.storyId}>
              {item.storyTitle}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
