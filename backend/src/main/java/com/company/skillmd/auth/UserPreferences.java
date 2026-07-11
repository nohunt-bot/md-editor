package com.company.skillmd.auth;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

/**
 * Per-user preferences that follow the account across devices (theme, language,
 * favorites, recently viewed). Keyed by userId (the dev-stub id now; the
 * Keycloak subject later). Device- or session-local prefs (view mode, active
 * team, dev identity) stay in localStorage and are NOT stored here.
 */
@Document(collection = "user_preferences")
public class UserPreferences {

    @Id
    private String userId;
    private String theme;    // "light" | "dark" | "system"
    private String language; // "zh-TW" | "en"

    // T1-4: favorites + recently viewed. Both nullable (no migration needed —
    // new fields on an existing collection). recentSkillIds is most-recent-
    // first, capped at 10 by the writer (FavoritesService), never rewritten
    // on read (visibility filtering happens at read time instead).
    private List<String> favoriteSkillIds;
    private List<String> recentSkillIds;

    public UserPreferences() {}

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public List<String> getFavoriteSkillIds() { return favoriteSkillIds; }
    public void setFavoriteSkillIds(List<String> favoriteSkillIds) { this.favoriteSkillIds = favoriteSkillIds; }

    public List<String> getRecentSkillIds() { return recentSkillIds; }
    public void setRecentSkillIds(List<String> recentSkillIds) { this.recentSkillIds = recentSkillIds; }
}
