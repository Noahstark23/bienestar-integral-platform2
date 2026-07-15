```markdown
# bienestar-integral-platform2 Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `bienestar-integral-platform2` TypeScript codebase. The repository follows clear coding standards, leverages conventional commit messages, and includes a basic testing structure. While no specific framework or automated workflows are detected, this guide will help you contribute code that matches the project's style and expectations.

## Coding Conventions

### File Naming
- **PascalCase** is used for file names.
  - Example: `UserProfile.ts`, `AuthService.ts`

### Import Style
- **Relative imports** are preferred.
  - Example:
    ```typescript
    import { AuthService } from './AuthService';
    ```

### Export Style
- **Mixed**: Both named and default exports are used.
  - Named export:
    ```typescript
    export function calculateBMI(weight: number, height: number): number {
      return weight / (height * height);
    }
    ```
  - Default export:
    ```typescript
    export default class UserProfile { ... }
    ```

### Commit Messages
- **Conventional commits** with the `feat` prefix are standard.
  - Example: `feat: add user authentication module`

## Workflows

### Adding a New Feature
**Trigger:** When implementing a new feature or module  
**Command:** `/add-feature`

1. Create a new file using PascalCase (e.g., `NewFeature.ts`).
2. Use relative imports to bring in dependencies.
3. Export your module or function using either named or default export, as appropriate.
4. Write a commit message using the conventional format:
   ```
   feat: short description of the feature
   ```
5. If applicable, add a corresponding test file (see Testing Patterns).

### Writing Tests
**Trigger:** When adding or updating code that requires testing  
**Command:** `/write-test`

1. Create a test file with the pattern `*.test.*` (e.g., `UserProfile.test.ts`).
2. Place your test file alongside the code it tests or in a dedicated test directory.
3. Use the project's preferred (unspecified) testing framework.
4. Write tests to cover new or changed functionality.

## Testing Patterns

- **File Pattern:** Test files are named with the `*.test.*` pattern (e.g., `AuthService.test.ts`).
- **Framework:** Not explicitly specified; follow existing patterns or consult the team.
- **Placement:** Test files are typically located near the code they test.

**Example Test File:**
```typescript
import { calculateBMI } from './HealthUtils';

describe('calculateBMI', () => {
  it('should calculate BMI correctly', () => {
    expect(calculateBMI(70, 1.75)).toBeCloseTo(22.86, 2);
  });
});
```

## Commands
| Command        | Purpose                                      |
|----------------|----------------------------------------------|
| /add-feature   | Scaffold and commit a new feature/module     |
| /write-test    | Create and structure a new test file         |
```
