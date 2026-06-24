package com.company.skillmd.skill;

import org.springframework.stereotype.Component;
import java.util.*;

@Component
public class ReferenceResolver {

    private final SkillRepository skillRepository;

    public ReferenceResolver(SkillRepository skillRepository) {
        this.skillRepository = skillRepository;
    }

    /**
     * Check if adding a reference would create a cycle
     */
    public Optional<List<String>> wouldCreateCycle(String skillId, String targetSkillId) {
        Set<String> visited = new HashSet<>();
        List<String> path = new ArrayList<>();
        
        if (hasPath(targetSkillId, skillId, visited, path)) {
            path.add(0, skillId);
            return Optional.of(path);
        }
        return Optional.empty();
    }

    private boolean hasPath(String fromId, String toId, Set<String> visited, List<String> path) {
        if (fromId.equals(toId)) {
            path.add(fromId);
            return true;
        }
        
        if (visited.contains(fromId)) {
            return false;
        }
        
        visited.add(fromId);
        path.add(fromId);
        
        Optional<Skill> skill = skillRepository.findById(fromId);
        if (skill.isPresent()) {
            List<Skill.SkillReference> refs = skill.get().getReferences();
            if (refs != null) {
                for (Skill.SkillReference ref : refs) {
                    if (hasPath(ref.getSkillId(), toId, visited, path)) {
                        return true;
                    }
                }
            }
        }
        
        path.remove(path.size() - 1);
        return false;
    }
}
