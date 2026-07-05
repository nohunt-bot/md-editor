package com.company.skillmd.auth;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserPreferencesRepository extends MongoRepository<UserPreferences, String> {
}
