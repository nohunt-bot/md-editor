package com.company.skillmd.auth;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Per-user preferences that follow the account across devices (theme, language).
 * Keyed by userId (the dev-stub id now; the Keycloak subject later). Device- or
 * session-local prefs (view mode, active team, dev identity) stay in
 * localStorage and are NOT stored here.
 */
@Document(collection = "user_preferences")
public class UserPreferences {

    @Id
    private String userId;
    private String theme;    // "light" | "dark" | "system"
    private String language; // "zh-TW" | "en"

    public UserPreferences() {}

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
}
