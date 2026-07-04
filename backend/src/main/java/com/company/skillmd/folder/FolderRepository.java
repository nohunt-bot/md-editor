package com.company.skillmd.folder;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FolderRepository extends MongoRepository<Folder, String> {

    List<Folder> findByParentId(String parentId);

    List<Folder> findByParentIdIsNull();

    boolean existsByTeamIdAndNameAndParentId(String teamId, String name, String parentId);

    boolean existsByTeamIdAndNameAndParentIdIsNull(String teamId, String name);
}
