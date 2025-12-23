## Description

<!-- Brief description of changes -->

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## LOT/EPIC Reference

- LOT:
- Related EPIC:

## Definition of Done (CLAUDE.md §7)

### Architecture & Boundaries
- [ ] Architecture boundaries respected (BOUNDARIES.md)
- [ ] No direct LLM calls outside Gateway LLM
- [ ] Tenant isolation maintained
- [ ] Layer responsibilities respected

### Security & RGPD
- [ ] No sensitive data in logs (events + IDs only)
- [ ] Data classification respected (DATA_CLASSIFICATION.md)
- [ ] No secrets in code/config/tests
- [ ] RGPD audit events emitted where required

### Testing
- [ ] Unit tests passing
- [ ] Integration tests passing (if applicable)
- [ ] RGPD tests passing (RGPD_TESTING.md)
- [ ] Error cases tested

### Quality
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] `npm run test:rgpd` passes

## Files Changed

<!-- List key files modified/created -->

## Testing Evidence

<!-- Commands run and results -->

## RGPD Impact Assessment

- [ ] No new personal data processing, OR
- [ ] New processing documented and justified
- [ ] Data minimization applied
- [ ] Retention policy defined

## Reviewer Notes

<!-- Anything reviewers should pay special attention to -->
