# Vietnam Competitor Landscape v1

| Field      | Value                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| Status     | Draft for review                                                                                        |
| Date       | 2026-07-05                                                                                              |
| Scope      | Public-market competitor scan for Vietnam teaching-center software                                      |
| Depends on | `docs/business/academic-business-architecture.md`, `docs/business/academic-context-map.md`              |
| Excludes   | Private pricing, non-public implementation details, deep study-abroad and labor-export product analysis |

## 1. Purpose

This document summarizes the current public competitor landscape for Vietnam-focused teaching-center software.

It answers:

- which product types already exist in market
- which competitors appear closest to the target product
- what capability clusters are already common
- where visible market gaps still exist

This is a strategic business document, not a technical benchmark.

## 2. Method

This landscape is based on public product pages available as of `2026-07-05`.

It uses:

- official landing pages
- official feature pages
- official company blog or product-intro pages

It does not assume access to:

- internal product demos
- customer-only features
- actual implementation quality
- exact pricing or win-rate data

Important caution:

- competitor claims below reflect what each vendor publicly communicates
- they do not guarantee actual product depth behind every advertised feature

## 3. Market Snapshot

The Vietnam market already has many products positioned for:

- language-center management
- teaching-center management
- tutoring / private teaching-center operations
- training-center administration
- student recruitment and CRM
- tuition and center finance basics

Most visible products sell some combination of:

1. `CRM / tuyển sinh`
2. `Học vụ / lớp học / lịch học`
3. `Thu học phí / công nợ / báo cáo`
4. `Đa chi nhánh / phân quyền`
5. `App / cổng học viên / tương tác`

This means the market is not empty.

The likely opportunity is not "software for centers exists or not".
The likely opportunity is:

- better support for Vietnam-specific operating models
- better financial and settlement rigor
- better modular product strategy across center management and future adjacent domains

## 4. Competitor Groups

The visible market can be grouped into four buckets:

1. `Center-management suites`
2. `Education-operation platforms with broad ecosystem`
3. `CRM-first or operator-workflow adjacent tools`
4. `Future-adjacent study-abroad capable products`

## 4.1 Center-management suites

These are the most direct competitors.

- `Easy Edu`
- `CenterOnline`
- `iLeader`
- `Faceworks`
- `Eduspace`
- `DotB EMS`

They mostly position around:

- center operations
- learner records
- class and academic administration
- tuition collection
- reporting

## 4.2 Education-operation platforms with broad ecosystem

These competitors position as a larger operating system for education businesses.

- `Mona EduTech`
- `VnResource EBM Pro`

They suggest broader platform ambition, often stretching beyond one narrow center-management use case.

## 4.3 CRM-first or adjacent workflow tools

These are not always center-management suites first, but may compete for budget or mindshare.

- `Getfly CRM`

They matter because some centers may choose:

- CRM + manual spreadsheets
- CRM + accounting tool
- CRM + partial center software

instead of adopting a full center-management platform immediately.

## 4.4 Future-adjacent study-abroad capable products

These are especially important because they overlap with the founder's future expansion direction.

- `Easy Edu` publicly lists `phần mềm quản lý trung tâm Du học`
- `iLeader` publicly positions for `trung tâm du học`
- `VnResource EBM Pro` publicly describes `quản lý du học`
- `Mona EduTech` publicly markets multiple products including study-abroad-oriented offerings

This suggests the market already sees `center management` and `study abroad` as neighboring commercial spaces, even if product depth differs.

## 5. Competitor Matrix

| Competitor                                                              | Public positioning                                                | Visible strengths from public pages                                                                                                                                      | Likely relevance to our product |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| [Easy Edu](https://easyedu.vn/phan-mem-quan-ly-trung-tam-ngoai-ngu/)    | Management software for language centers and education businesses | Strong ecosystem story, public claim of `1,400+` centers, broad modules across CRM, training, finance, HRM, marketing, plus separate pages for tutoring and study abroad | High                            |
| [CenterOnline](https://center.edu.vn/)                                  | Center-management suite for language centers                      | Clear 5-module structure: `CRM`, `Đào tạo`, `Người dùng`, `Tài chính`, `Báo cáo`; multi-branch positioning; explicit role coverage                                       | High                            |
| [iLeader](https://ileader.vn/)                                          | Popular training-center management software                       | Strong operational messaging around course registration, tuition, schedules, reporting; public claim around `800` centers; explicitly mentions study-abroad fit          | High                            |
| [Faceworks](https://faceworks.vn/phan-mem-quan-ly-trung-tam-tieng-anh/) | Full management for one or many English-center branches           | Multi-branch management and professional operations positioning                                                                                                          | Medium                          |
| [Eduspace](https://eduspace.vn/phan-mem-quan-ly-trung-tam-ngoai-ngu)    | Specialized software for foreign-language centers                 | Strong "built specifically for language education" positioning; explicitly references domain specifics like `bảo lưu`, `xếp lớp theo trình độ`, `giáo viên part-time`    | High                            |
| [DotB EMS](https://dotb.vn/)                                            | All-in-one digital education ecosystem for training centers       | Cloud-first language, `360` learner-data tracking, standardized student data, education-operations positioning                                                           | Medium                          |
| [VnResource EBM Pro](https://blog.vnresource.vn/ebm/)                   | Education/training management platform                            | CRM + enterprise-flavored management + explicit study-abroad management and pre-study language training links                                                            | High                            |
| [Mona EduTech](https://mona.software/edutech/)                          | Education technology ecosystem                                    | Publicly presents multiple products for centers, tutoring, study abroad, labor-export-adjacent business lines                                                            | High                            |
| [Getfly CRM](https://getfly.vn/)                                        | CRM platform                                                      | Strong CRM/tuyển sinh competition for centers that do not yet adopt a full operating suite                                                                               | Medium                          |

## 6. Notable Public Signals by Competitor

## 6.1 Easy Edu

Public signals:

- states `Hơn 1.400+ Trung tâm tin dùng`
- positions around `CRM`, `Đào tạo`, `Tài chính`, `HRM`, `Marketing`
- publicly lists pages for `Du học` and `Gia sư`

Interpretation:

- this competitor is not just selling class management
- it is selling an education-business operating ecosystem

## 6.2 CenterOnline

Public signals:

- clearly describes `5 Module`: `CRM`, `Đào tạo`, `Người dùng`, `Tài chính`, `Báo cáo`
- explicitly positions for `đa chi nhánh`
- explicitly names operator roles such as accounting, admissions, consulting, and marketing

Interpretation:

- this competitor communicates a very understandable center-operations value proposition
- the product story is operationally coherent, not only feature-list based

## 6.3 iLeader

Public signals:

- states fit for several education-center types including study-abroad centers
- public feature copy includes `đăng ký khóa học`, `thu học phí`, `báo cáo doanh thu học phí`, `báo cáo chi phí lương`

Interpretation:

- this competitor appears to bridge both academic and operating-finance basics
- salary-cost reporting suggests at least some staffing/compensation awareness

## 6.4 Eduspace

Public signals:

- stresses that generic enterprise software is not enough for language centers
- explicitly references `bảo lưu khóa học`, `xếp lớp theo trình độ`, `giáo viên part-time`

Interpretation:

- this is one of the clearest public signals that domain-specific center operations still matter in market positioning

## 6.5 VnResource EBM Pro

Public signals:

- public `quản lý du học` section includes potential student tracking, counseling history, pre-study training, contract execution, and advance-payment tracking

Interpretation:

- this competitor validates the idea that study abroad often connects with language-training operations
- it also validates that finance is not separate from that workflow

## 6.6 Mona EduTech

Public signals:

- public ecosystem includes `Mona EduCenter`, `Mona EduConnect`, and `GlobalEd`

Interpretation:

- this is an important market signal for future modular product strategy
- the market likely accepts separate but related product lines for center, tutoring, and adjacent education services

## 7. Capability Patterns Already Common in Market

The following capabilities appear to be common or expected:

1. `Lead / CRM / tuyển sinh`
2. `Học viên / hồ sơ`
3. `Khóa học / lớp học / lịch học`
4. `Thu học phí / công nợ`
5. `Phân quyền / người dùng`
6. `Đa chi nhánh`
7. `Báo cáo vận hành`

This means these are likely baseline expectations, not differentiators by themselves.

## 8. Visible Gaps and Weakly-Signaled Areas

Based on public pages, the following areas appear less clearly explained or less deeply signaled:

## 8.1 Teacher-led tutoring center economics

Many vendors mention tutoring or private teaching, but public messaging rarely explains:

- teacher brings learners into center
- revenue sharing with teacher
- adjustable settlement percentage
- payable and teacher-settlement rigor

This may be a real differentiation area.

## 8.2 Financial rigor beyond tuition collection

Public messaging often mentions:

- tuition
- debt
- revenue
- basic cost

But less often explains in detail:

- receivable lifecycle
- payable lifecycle
- teacher commercial terms
- operating expense control
- invoice lifecycle and compliance readiness

This is strategically important because your product thesis already treats finance as core.

## 8.3 Cross-domain learner lifecycle

Public sites suggest adjacency between:

- language learning
- tutoring
- study abroad

But public stories rarely explain a clear shared lifecycle such as:

- learner studies language first
- same person later enters study-abroad pipeline
- finance remains traceable across both contexts

This may become a future platform differentiation area if modeled carefully.

## 8.4 Product modularity clarity

Some competitors clearly operate ecosystems, but public packaging logic is not always explicit.

This creates a potential opportunity for:

- clearer module boundaries
- clearer SaaS packaging
- better bundle story for centers with mixed business lines

## 9. Competitive Implications for Our Product

The current market suggests these strategic implications:

## 9.1 We should not enter with a generic "center management" story

That positioning is already crowded.

## 9.2 We need strong baseline center operations

The first product must still cover:

- admissions basics
- class and enrollment operations
- schedules and rooms
- tuition and payment
- branch-aware reporting

Without that, the product will fail basic market expectation.

## 9.3 Our strongest differentiation should likely come from business-model fit

The most promising visible differentiation areas are:

- strong support for both `center-led` and `teacher-led` operations
- explicit financial modeling for teacher settlement
- stronger operating-finance rigor
- future-ready bridge into study-abroad or labor-export adjacent products

## 9.4 Finance should remain a first-class product pillar

Competitors validate that finance matters.
Your architecture should continue to treat finance as core, not secondary.

## 10. Strategic Positioning Hypothesis

Based on this landscape, the strongest early positioning hypothesis is:

`A Vietnam-first center operating system for real center-led and teacher-led education businesses, with stronger financial control than generic center software.`

This is stronger than:

- generic center management
- pure LMS positioning
- pure CRM positioning

## 11. Suggested Next Strategic Work

This competitor scan should be followed by:

1. `competitive feature matrix`
2. `phase-1 product positioning`
3. `module packaging strategy`
4. `first-customer ICP definition`

## 12. Source Pages

Public sources used in this document:

- [Easy Edu](https://easyedu.vn/phan-mem-quan-ly-trung-tam-ngoai-ngu/)
- [CenterOnline](https://center.edu.vn/)
- [iLeader](https://ileader.vn/)
- [Faceworks](https://faceworks.vn/phan-mem-quan-ly-trung-tam-tieng-anh/)
- [Eduspace](https://eduspace.vn/phan-mem-quan-ly-trung-tam-ngoai-ngu)
- [DotB EMS](https://dotb.vn/)
- [VnResource EBM Pro](https://blog.vnresource.vn/ebm/)
- [Mona EduTech](https://mona.software/edutech/)

## 13. Conclusion

The Vietnam market already has many center-management products.

The opportunity is not to be the first product in the category.
The opportunity is to be:

- more aligned with real Vietnam operating models
- stronger in finance and settlement rigor
- more modular across current and future education business lines

If the product enters market with only generic class-management value, it will likely be undifferentiated.
