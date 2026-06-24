package com.company.skillmd.tag;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class TagService {

    private final TagRepository tagRepository;

    public TagService(TagRepository tagRepository) {
        this.tagRepository = tagRepository;
    }

    public Tag getOrCreateTag(String name) {
        return tagRepository.findByName(name)
            .orElseGet(() -> {
                Tag tag = new Tag();
                tag.setName(name);
                tag.setColor(generateColor(name));
                tag.setUsageCount(0);
                return tagRepository.save(tag);
            });
    }

    public void incrementUsage(String tagName) {
        tagRepository.findByName(tagName).ifPresent(tag -> {
            tag.setUsageCount(tag.getUsageCount() + 1);
            tagRepository.save(tag);
        });
    }

    public void decrementUsage(String tagName) {
        tagRepository.findByName(tagName).ifPresent(tag -> {
            int newCount = Math.max(0, tag.getUsageCount() - 1);
            tag.setUsageCount(newCount);
            tagRepository.save(tag);
        });
    }

    public List<Tag> getAllTags() {
        return tagRepository.findAll();
    }

    private String generateColor(String name) {
        // Simple hash-based color generation
        int hash = name.hashCode();
        String hex = String.format("%06X", (hash & 0x7FFFFF) | 0x400000);
        return "#" + hex;
    }
}
