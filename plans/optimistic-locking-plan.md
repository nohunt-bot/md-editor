# Optimistic Locking (Conflict Detection) Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Implement optimistic locking for concurrent skill editing - detect conflicts when multiple users edit the same skill simultaneously.

**Architecture:** 
- Backend: Add version field to UpdateSkillRequest, check version mismatch, return 409 Conflict with current content
- Frontend: Send version on save, handle 409 response, show diff viewer, let user choose override/merge/abandon

**Tech Stack:** Spring Boot, React, react-diff-viewer-continued (already installed)

---

## Task 1: Add version field to UpdateSkillRequest DTO

**Objective:** Include expectedVersion field in update request

**Files:**
- Modify: `backend/src/main/java/com/company/skillmd/skill/dto/UpdateSkillRequest.java`

**Step 1: Add expectedVersion field**

```java
public record UpdateSkillRequest(
    String name,
    String displayName,
    String description,
    String content,
    String folderId,
    List<String> tags,
    List<ReferenceDTO> references,
    List<PrerequisiteDTO> prerequisites,
    String commitMessage,
    Integer expectedVersion  // NEW: for optimistic locking
) {
    public record ReferenceDTO(String skillId, String relation) {}
    public record PrerequisiteDTO(String skillId, String note) {}
}
```

**Step 2: Compile**

Run: `cd backend && ./mvnw compile -q`
Expected: BUILD SUCCESS

**Step 3: Commit**

```bash
git add backend/src/main/java/com/company/skillmd/skill/dto/UpdateSkillRequest.java
git commit -m "feat: add expectedVersion field to UpdateSkillRequest for optimistic locking"
```

---

## Task 2: Create ConflictResponse DTO

**Objective:** Create response DTO for 409 Conflict with current skill content

**Files:**
- Create: `backend/src/main/java/com/company/skillmd/skill/dto/ConflictResponse.java`

**Step 1: Create DTO**

```java
package com.company.skillmd.skill.dto;

import java.time.Instant;

public record ConflictResponse(
    String skillId,
    Integer currentVersion,
    Instant currentUpdatedAt,
    String currentContent,
    String currentEditorId,
    String message
) {
    public static ConflictResponse of(
        String skillId,
        Integer version,
        Instant updatedAt,
        String content,
        String editorId
    ) {
        return new ConflictResponse(
            skillId,
            version,
            updatedAt,
            content,
            editorId,
            "This skill was modified by another user. Please review the changes."
        );
    }
}
```

**Step 2: Compile**

Run: `cd backend && ./mvnw compile -q`
Expected: BUILD SUCCESS

**Step 3: Commit**

```bash
git add backend/src/main/java/com/company/skillmd/skill/dto/ConflictResponse.java
git commit -m "feat: add ConflictResponse DTO for optimistic lock conflicts"
```

---

## Task 3: Update SkillService.updateSkill with version check

**Objective:** Check version mismatch and throw ConflictException

**Files:**
- Modify: `backend/src/main/java/com/company/skillmd/skill/SkillService.java`

**Step 1: Read current SkillService**

Read the file to understand current implementation.

**Step 2: Add version check logic**

```java
public SkillResponse updateSkill(String id, UpdateSkillRequest request, String userId) {
    Skill skill = skillRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Skill not found"));
    
    // Optimistic locking check
    if (request.expectedVersion() != null) {
        if (!skill.getCurrentVersion().equals(request.expectedVersion())) {
            throw new OptimisticLockingConflictException(
                skill.getId(),
                skill.getCurrentVersion(),
                skill.getUpdatedAt(),
                skill.getContent(),
                skill.getLastEditorId()
            );
        }
    }
    
    // ... rest of existing update logic
}
```

**Step 3: Create OptimisticLockingConflictException**

Create: `backend/src/main/java/com/company/skillmd/skill/OptimisticLockingConflictException.java`

```java
package com.company.skillmd.skill;

import java.time.Instant;

public class OptimisticLockingConflictException extends RuntimeException {
    private final String skillId;
    private final Integer currentVersion;
    private final Instant currentUpdatedAt;
    private final String currentContent;
    private final String currentEditorId;
    
    public OptimisticLockingConflictException(
        String skillId,
        Integer currentVersion,
        Instant currentUpdatedAt,
        String currentContent,
        String currentEditorId
    ) {
        super("Optimistic locking conflict for skill " + skillId);
        this.skillId = skillId;
        this.currentVersion = currentVersion;
        this.currentUpdatedAt = currentUpdatedAt;
        this.currentContent = currentContent;
        this.currentEditorId = currentEditorId;
    }
    
    // Getters
    public String getSkillId() { return skillId; }
    public Integer getCurrentVersion() { return currentVersion; }
    public Instant getCurrentUpdatedAt() { return currentUpdatedAt; }
    public String getCurrentContent() { return currentContent; }
    public String getCurrentEditorId() { return currentEditorId; }
}
```

**Step 4: Compile**

Run: `cd backend && ./mvnw compile -q`
Expected: BUILD SUCCESS

**Step 5: Commit**

```bash
git add backend/src/main/java/com/company/skillmd/skill/SkillService.java
git add backend/src/main/java/com/company/skillmd/skill/OptimisticLockingConflictException.java
git commit -m "feat: add optimistic locking check in SkillService"
```

---

## Task 4: Add GlobalExceptionHandler for OptimisticLockingConflictException

**Objective:** Handle exception and return 409 with ConflictResponse

**Files:**
- Modify: `backend/src/main/java/com/company/skillmd/GlobalExceptionHandler.java` (or create if not exists)

**Step 1: Read or create GlobalExceptionHandler**

Check if file exists and read it.

**Step 2: Add exception handler**

```java
@ExceptionHandler(OptimisticLockingConflictException.class)
public ResponseEntity<ConflictResponse> handleOptimisticLockingConflict(
    OptimisticLockingConflictException ex
) {
    ConflictResponse response = ConflictResponse.of(
        ex.getSkillId(),
        ex.getCurrentVersion(),
        ex.getCurrentUpdatedAt(),
        ex.getCurrentContent(),
        ex.getCurrentEditorId()
    );
    return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
}
```

**Step 3: Add imports**

```java
import com.company.skillmd.skill.OptimisticLockingConflictException;
import com.company.skillmd.skill.dto.ConflictResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
```

**Step 4: Compile**

Run: `cd backend && ./mvnw compile -q`
Expected: BUILD SUCCESS

**Step 5: Commit**

```bash
git add backend/src/main/java/com/company/skillmd/GlobalExceptionHandler.java
git commit -m "feat: handle OptimisticLockingConflictException with 409 response"
```

---

## Task 5: Update SkillResponse to include version

**Objective:** Add currentVersion and updatedAt to SkillResponse for frontend to track

**Files:**
- Modify: `backend/src/main/java/com/company/skillmd/skill/dto/SkillResponse.java`

**Step 1: Read current SkillResponse**

Read the file to understand current structure.

**Step 2: Add version fields**

```java
public record SkillResponse(
    String id,
    String name,
    String displayName,
    String description,
    String content,
    String folderId,
    List<String> tags,
    List<ReferenceResponse> references,
    List<PrerequisiteResponse> prerequisites,
    Integer currentVersion,      // NEW
    Instant updatedAt,           // NEW
    String lastEditorId,         // NEW
    Instant createdAt
) {
    public static SkillResponse from(Skill skill) {
        return new SkillResponse(
            skill.getId(),
            skill.getName(),
            skill.getDisplayName(),
            skill.getDescription(),
            skill.getContent(),
            skill.getFolderId(),
            skill.getTags(),
            // ... references, prerequisites
            skill.getCurrentVersion(),
            skill.getUpdatedAt(),
            skill.getLastEditorId(),
            skill.getCreatedAt()
        );
    }
    // ... nested records
}
```

**Step 3: Compile**

Run: `cd backend && ./mvnw compile -q`
Expected: BUILD SUCCESS

**Step 4: Commit**

```bash
git add backend/src/main/java/com/company/skillmd/skill/dto/SkillResponse.java
git commit -m "feat: add version fields to SkillResponse"
```

---

## Task 6: Update frontend SkillEditor to track version

**Objective:** Store version from API response and send on save

**Files:**
- Modify: `frontend/src/components/editor/SkillEditor.tsx`

**Step 1: Add version state**

```typescript
const [formData, setFormData] = useState({
  name: '',
  displayName: '',
  description: '',
  content: '',
  folderId: '',
  tags: [] as string[],
  commitMessage: '',
  currentVersion: 0,      // NEW
  updatedAt: null as string | null  // NEW
})
```

**Step 2: Update loadSkill to store version**

```typescript
async function loadSkill() {
  if (!id) return
  try {
    const res = await skillApi.get(id)
    const skill = res.data
    setFormData({
      name: skill.name,
      displayName: skill.displayName || '',
      description: skill.description || '',
      content: skill.content,
      folderId: skill.folderId || '',
      tags: skill.tags || [],
      commitMessage: '',
      currentVersion: skill.currentVersion,      // NEW
      updatedAt: skill.updatedAt                 // NEW
    })
  } catch (error) {
    console.error('Failed to load skill:', error)
    alert('Failed to load skill')
  } finally {
    setLoading(false)
  }
}
```

**Step 3: Update handleSave to send version**

```typescript
async function handleSave() {
  if (!formData.name || !formData.content) {
    alert('Name and content are required')
    return
  }

  setSaving(true)
  try {
    if (isEditing && id) {
      const updateData: UpdateSkillData = {
        ...formData,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        expectedVersion: formData.currentVersion  // NEW
      }
      await skillApi.update(id, updateData)
    } else {
      // ... create logic
    }
    navigate('/skills')
  } catch (error: any) {
    console.error('Failed to save skill:', error)
    alert('Failed to save: ' + (error.response?.data?.message || error.message))
  } finally {
    setSaving(false)
  }
}
```

**Step 4: Commit**

```bash
git add frontend/src/components/editor/SkillEditor.tsx
git commit -m "feat: track version in SkillEditor for optimistic locking"
```

---

## Task 7: Handle 409 Conflict response in frontend

**Objective:** Detect 409 response and show conflict dialog

**Files:**
- Modify: `frontend/src/components/editor/SkillEditor.tsx`

**Step 1: Add conflict state**

```typescript
const [conflict, setConflict] = useState<{
  currentVersion: number
  currentContent: string
  currentEditorId: string
  message: string
} | null>(null)
```

**Step 2: Update handleSave error handling**

```typescript
async function handleSave() {
  // ... existing validation
  
  setSaving(true)
  try {
    if (isEditing && id) {
      const updateData: UpdateSkillData = {
        ...formData,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        expectedVersion: formData.currentVersion
      }
      await skillApi.update(id, updateData)
    }
    navigate('/skills')
  } catch (error: any) {
    if (error.response?.status === 409) {
      // Optimistic lock conflict
      const data = error.response.data
      setConflict({
        currentVersion: data.currentVersion,
        currentContent: data.currentContent,
        currentEditorId: data.currentEditorId,
        message: data.message
      })
      return  // Don't navigate away
    }
    console.error('Failed to save skill:', error)
    alert('Failed to save: ' + (error.response?.data?.message || error.message))
  } finally {
    setSaving(false)
  }
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/editor/SkillEditor.tsx
git commit -m "feat: handle 409 conflict response in SkillEditor"
```

---

## Task 8: Create ConflictDialog component

**Objective:** Show diff between user's content and current server content

**Files:**
- Create: `frontend/src/components/dialog/ConflictDialog.tsx`
- Create: `frontend/src/components/dialog/ConflictDialog.css`

**Step 1: Create ConflictDialog**

```typescript
import { useState } from 'react'
import ReactDiffViewer from 'react-diff-viewer-continued'
import './ConflictDialog.css'

interface ConflictDialogProps {
  newContent: string
  currentContent: string
  currentVersion: number
  currentEditorId: string
  message: string
  onOverride: () => void
  onMerge: (mergedContent: string) => void
  onAbandon: () => void
}

export function ConflictDialog({
  newContent,
  currentContent,
  currentVersion,
  currentEditorId,
  message,
  onOverride,
  onMerge,
  onAbandon
}: ConflictDialogProps) {
  const [showDiff, setShowDiff] = useState(true)

  return (
    <div className="conflict-dialog-overlay">
      <div className="conflict-dialog">
        <div className="conflict-header">
          <h2>⚠️ Edit Conflict Detected</h2>
          <p className="conflict-message">{message}</p>
        </div>

        <div className="conflict-info">
          <p>
            <strong>Version:</strong> {currentVersion} (by {currentEditorId})
          </p>
          <p>
            This skill was modified while you were editing. Please review the changes below.
          </p>
        </div>

        <div className="conflict-actions">
          <button onClick={() => setShowDiff(!showDiff)}>
            {showDiff ? 'Hide Diff' : 'Show Diff'}
          </button>
        </div>

        {showDiff && (
          <div className="conflict-diff">
            <ReactDiffViewer
              oldValue={currentContent}
              newValue={newContent}
              splitView={true}
              leftTitle={`Server (v${currentVersion})`}
              rightTitle="Your changes"
              useDarkTheme={true}
            />
          </div>
        )}

        <div className="conflict-actions">
          <button 
            className="btn-override" 
            onClick={onOverride}
          >
            Override (Force Save)
          </button>
          <button 
            className="btn-merge" 
            onClick={() => onMerge(currentContent)}
          >
            Use Server Version
          </button>
          <button 
            className="btn-abandon" 
            onClick={onAbandon}
          >
            Abandon Changes
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Create CSS**

```css
.conflict-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.conflict-dialog {
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  padding: 2rem;
  max-width: 1200px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.conflict-header h2 {
  margin: 0 0 1rem 0;
  color: #ff6b6b;
}

.conflict-message {
  color: #a0a0b0;
  margin: 0 0 1.5rem 0;
}

.conflict-info {
  background: #161626;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.conflict-info p {
  margin: 0.5rem 0;
  color: #e0e0e0;
}

.conflict-diff {
  margin: 1.5rem 0;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  overflow: hidden;
}

.conflict-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.conflict-actions button {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  border: 1px solid #2a2a4a;
  background: #161626;
  color: #e0e0e0;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.conflict-actions button:hover {
  border-color: #00d4ff;
  color: #00d4ff;
}

.btn-override {
  background: #ff6b6b !important;
  border-color: #ff6b6b !important;
  color: white !important;
}

.btn-override:hover {
  background: #ff5252 !important;
}

.btn-merge {
  background: #4ecdc4 !important;
  border-color: #4ecdc4 !important;
  color: white !important;
}

.btn-merge:hover {
  background: #45b7af !important;
}

.btn-abandon {
  background: #666 !important;
  border-color: #666 !important;
  color: white !important;
}

.btn-abandon:hover {
  background: #555 !important;
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/dialog/ConflictDialog.tsx
git add frontend/src/components/dialog/ConflictDialog.css
git commit -m "feat: add ConflictDialog with diff viewer"
```

---

## Task 9: Integrate ConflictDialog into SkillEditor

**Objective:** Show conflict dialog when 409 detected

**Files:**
- Modify: `frontend/src/components/editor/SkillEditor.tsx`

**Step 1: Import ConflictDialog**

```typescript
import { ConflictDialog } from '../dialog/ConflictDialog'
```

**Step 2: Add dialog rendering**

Add after the main editor JSX:

```typescript
{conflict && (
  <ConflictDialog
    newContent={formData.content}
    currentContent={conflict.currentContent}
    currentVersion={conflict.currentVersion}
    currentEditorId={conflict.currentEditorId}
    message={conflict.message}
    onOverride={() => handleOverride()}
    onMerge={(mergedContent) => handleMerge(mergedContent)}
    onAbandon={() => handleAbandon()}
  />
)}
```

**Step 3: Add handler functions**

```typescript
function handleOverride() {
  // Force save without version check
  // TODO: Add force flag to API or remove version from request
  setConflict(null)
  // Retry save without version check
  saveWithoutVersionCheck()
}

function handleMerge(mergedContent: string) {
  // Use server version, discard local changes
  setFormData(prev => ({ ...prev, content: mergedContent }))
  setConflict(null)
}

function handleAbandon() {
  // Navigate back without saving
  setConflict(null)
  navigate('/skills')
}

function saveWithoutVersionCheck() {
  // Same as handleSave but without expectedVersion
  // ... implementation
}
```

**Step 4: Commit**

```bash
git add frontend/src/components/editor/SkillEditor.tsx
git commit -m "feat: integrate ConflictDialog into SkillEditor"
```

---

## Task 10: Add force save option to backend

**Objective:** Allow override with force flag

**Files:**
- Modify: `backend/src/main/java/com/company/skillmd/skill/dto/UpdateSkillRequest.java`
- Modify: `backend/src/main/java/com/company/skillmd/skill/SkillService.java`

**Step 1: Add forceUpdate field to DTO**

```java
public record UpdateSkillRequest(
    // ... existing fields
    Integer expectedVersion,
    Boolean forceUpdate  // NEW: bypass version check
) { ... }
```

**Step 2: Update SkillService version check**

```java
// Optimistic locking check
if (request.expectedVersion() != null && !Boolean.TRUE.equals(request.forceUpdate())) {
    if (!skill.getCurrentVersion().equals(request.expectedVersion())) {
        throw new OptimisticLockingConflictException(...);
    }
}
```

**Step 3: Compile**

Run: `cd backend && ./mvnw compile -q`
Expected: BUILD SUCCESS

**Step 4: Commit**

```bash
git add backend/src/main/java/com/company/skillmd/skill/dto/UpdateSkillRequest.java
git add backend/src/main/java/com/company/skillmd/skill/SkillService.java
git commit -m "feat: add forceUpdate flag to bypass optimistic locking"
```

---

## Task 11: Update handleOverride to use force flag

**Objective:** Send forceUpdate=true when user chooses to override

**Files:**
- Modify: `frontend/src/components/editor/SkillEditor.tsx`

**Step 1: Update handleOverride**

```typescript
async function handleOverride() {
  if (!id) return
  setConflict(null)
  setSaving(true)
  try {
    const updateData: UpdateSkillData = {
      ...formData,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      expectedVersion: formData.currentVersion,
      forceUpdate: true  // Force override
    }
    await skillApi.update(id, updateData)
    navigate('/skills')
  } catch (error: any) {
    console.error('Failed to force save:', error)
    alert('Failed to save: ' + (error.response?.data?.message || error.message))
  } finally {
    setSaving(false)
  }
}
```

**Step 2: Update UpdateSkillData type**

Add to `frontend/src/api/api.ts`:

```typescript
export type UpdateSkillData = {
  // ... existing fields
  expectedVersion?: number
  forceUpdate?: boolean
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/editor/SkillEditor.tsx
git add frontend/src/api/api.ts
git commit -m "feat: implement force save with forceUpdate flag"
```

---

## Task 12: Test optimistic locking flow

**Objective:** Verify conflict detection works end-to-end

**Files:**
- Manual testing

**Step 1: Start backend and frontend**

```bash
cd backend && ./mvnw spring-boot:run
cd frontend && npm start
```

**Step 2: Test scenario**

1. Open skill in Browser Tab A
2. Open same skill in Browser Tab B
3. Edit and save in Tab B (version becomes 2)
4. Edit and save in Tab A (should show conflict dialog)
5. Verify diff shows correctly
6. Test Override - should save successfully
7. Test Merge - should use server version
8. Test Abandon - should navigate back

**Step 3: Verify API response**

Check browser DevTools Network tab:
- 409 response should have ConflictResponse body
- Diff viewer should show correct old/new content

---

## Verification

**Backend:**
```bash
cd backend && ./mvnw test -q
```

**Frontend:**
```bash
cd frontend && npm run build
```

**Git status:**
```bash
git log --oneline -12
```

Should show 12 commits for this feature.

---

## Summary

**Files Created:**
- `backend/.../dto/ConflictResponse.java`
- `backend/.../skill/OptimisticLockingConflictException.java`
- `frontend/src/components/dialog/ConflictDialog.tsx`
- `frontend/src/components/dialog/ConflictDialog.css`

**Files Modified:**
- `backend/.../dto/UpdateSkillRequest.java` (2x)
- `backend/.../skill/SkillService.java` (2x)
- `backend/.../GlobalExceptionHandler.java`
- `backend/.../dto/SkillResponse.java`
- `frontend/src/components/editor/SkillEditor.tsx` (4x)
- `frontend/src/api/api.ts`

**Total:** 4 new files, 7 modifications, 12 commits
