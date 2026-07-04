package com.company.skillmd.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.HashMap;
import java.util.Map;

@ConfigurationProperties(prefix = "app")
public class DevUserProperties {

    private Map<String, DevUser> devUsers = new HashMap<>();

    public Map<String, DevUser> getDevUsers() {
        return devUsers;
    }

    public void setDevUsers(Map<String, DevUser> devUsers) {
        this.devUsers = devUsers;
    }

    public static class DevUser {
        private String displayName;
        private Map<String, Role> teams = new HashMap<>();
        private boolean admin;

        public String getDisplayName() {
            return displayName;
        }

        public void setDisplayName(String displayName) {
            this.displayName = displayName;
        }

        public Map<String, Role> getTeams() {
            return teams;
        }

        public void setTeams(Map<String, Role> teams) {
            this.teams = teams;
        }

        public boolean isAdmin() {
            return admin;
        }

        public void setAdmin(boolean admin) {
            this.admin = admin;
        }
    }
}
