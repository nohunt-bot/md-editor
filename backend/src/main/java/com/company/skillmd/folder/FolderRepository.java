package com.company.skillmd.folder;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface FolderRepository extends MongoRepository<Folder, String> {
    
    List<Folder> findByParentId(String parentId);
    
    List<Folder> findByParentIdNull();
    
    Optional<Folder> findByNameAndParentId(String name, String parentId);
    
    List<Folder> findByOwnerId(String ownerId);
}
