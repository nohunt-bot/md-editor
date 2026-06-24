#!/bin/bash
# Seed test data into MongoDB

MONGO_URI="${MONGO_URI:-mongodb://localhost:27017/skillmd}"

echo "🌱 Seeding test data..."

mongosh "$MONGO_URI" <<'EOF'
// Insert test skills
db.skills.insertMany([
  {
    _id: ObjectId(),
    name: "hermes-agent",
    displayName: "Hermes Agent Configuration",
    description: "Configure, extend, or contribute to Hermes Agent",
    content: "# Hermes Agent\n\nThis skill covers configuring, setting up, or using Hermes Agent itself.",
    folderId: null,
    tags: ["agent", "configuration", "hermes"],
    references: [],
    prerequisites: [],
    currentVersion: 1,
    authorId: "admin",
    lastEditorId: "admin",
    createdAt: ISODate(),
    updatedAt: ISODate(),
    deletedAt: null
  },
  {
    _id: ObjectId(),
    name: "github-pr-workflow",
    displayName: "GitHub PR Workflow",
    description: "GitHub PR lifecycle: branch, commit, open, CI, merge",
    content: "# GitHub PR Workflow\n\n## Creating a PR\n\n1. Create a new branch\n2. Make commits\n3. Push to remote\n4. Open PR on GitHub",
    folderId: null,
    tags: ["github", "workflow", "pr"],
    references: [],
    prerequisites: [],
    currentVersion: 1,
    authorId: "admin",
    lastEditorId: "admin",
    createdAt: ISODate(),
    updatedAt: ISODate(),
    deletedAt: null
  },
  {
    _id: ObjectId(),
    name: "test-driven-development",
    displayName: "Test-Driven Development",
    description: "TDD: enforce RED-GREEN-REFACTOR, tests before code",
    content: "# TDD\n\n## The Cycle\n\n1. RED - Write a failing test\n2. GREEN - Make it pass\n3. REFACTOR - Clean up",
    folderId: null,
    tags: ["testing", "tdd", "best-practice"],
    references: [],
    prerequisites: [],
    currentVersion: 1,
    authorId: "admin",
    lastEditorId: "admin",
    createdAt: ISODate(),
    updatedAt: ISODate(),
    deletedAt: null
  }
]);

// Insert test folders
db.folders.insertMany([
  {
    _id: ObjectId(),
    name: "AI Agent",
    parentId: null,
    path: "/ai-agent",
    ownerId: "admin",
    createdAt: ISODate(),
    updatedAt: ISODate()
  },
  {
    _id: ObjectId(),
    name: "DevOps",
    parentId: null,
    path: "/devops",
    ownerId: "admin",
    createdAt: ISODate(),
    updatedAt: ISODate()
  }
]);

// Insert test tags
db.tags.insertMany([
  { _id: ObjectId(), name: "agent", color: "#4A90D9", usageCount: 1 },
  { _id: ObjectId(), name: "configuration", color: "#D9A74A", usageCount: 1 },
  { _id: ObjectId(), name: "github", color: "#4AD9A7", usageCount: 1 },
  { _id: ObjectId(), name: "testing", color: "#D94A90", usageCount: 1 }
]);

print("✅ Test data seeded successfully!");
EOF

echo "Done!"
