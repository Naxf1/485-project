SWE 485 Semester Project
Advanced Software Engineering with AI
Student project brief  |  Term 1 1448 AH  |  2026–2027
Work individually or in a pair to build an app, agentic workflow, agent or multi-agent system using DEVAI. Every member must explain and defend the product and the evidence of specification, review, testing and improvement.
Core standard: Nothing enters your repository that a member of your team cannot explain.
Project milestones and grading
The project contributes 30% of the course grade. Submit each milestone as one package, following the published submission and review instructions.
Milestone
Schedule in 2026
Marks
Project share
M1 Requirements and architecture
Due 21 Oct
26
20%
M2 Vertical slice and tests  |  Week 10
29 Oct
22
23%
M3 Review and evaluation  |  Week 12
8–12 Nov
28
23%
M4 Release and defense  |  Week 14
29 Nov–3 Dec
100
34%

Project percentage = 100 × [0.20(M1/26) + 0.23(M2/22) + 0.23(M3/28) + 0.34(M4/100)]. Course points = 0.30 × project percentage. Normalize each milestone separately; do not divide the total raw score by 176. The 10% lab component is separate.
Possible projects
Choose one of four project types and keep the scope manageable for one or two students:
• App: a web or mobile application, such as equipment booking, a study planner or a service tracker.
• Agentic workflow: connected AI and tool-assisted steps, such as classifying requests, drafting responses and routing them for human approval.
• Agent: an AI system that selects actions and uses tools, such as a course-information assistant that retrieves sources and answers questions.
• Multi-agent system: coordinated agents with distinct roles, such as research, drafting and review agents producing a briefing with a shared task record.
Use public or synthetic data. All four types follow the same milestones and evidence requirements.
Technical scope and limits
Include at least four elements: frontend, backend, persistence, API integration, access control, automated tests, security scanning, monitoring/dashboard, substantial refactoring/migration, AI or agentic functionality, or retrieval/RAG. All projects need the testing, security and refactoring evidence assessed in M2 and M3.
Scope ceilings where applicable: 6 screens/views, 10 API endpoints, 8 tables/collections, 2 user roles and one deployment target. Avoid Kubernetes, custom CI runners and multi-region infrastructure. These are maximums, not targets.
For agent-based projects, define each agent’s role, permitted tools, inputs and outputs, handoffs, stopping conditions and human approval points. A separate user interface or RAG component is optional.
Team and tool arrangements
Projects have 1–2 members. Confirm membership in Week 1; changes after Week 2 require instructor approval. Everyone must contribute visibly to the repository. Agree scope adjustments with the instructor.
Approved tool: DEVAI. Use it for AI-assisted development. Declare your approved primary language at M1; changing it afterward forfeits the Week 10 mutation-gauntlet marks. Sensitive institutional data requires prior approval and an approved data path.
M1 Requirements and architecture
Deadline 21 October 2026  |  26 marks  |  20% of the project
Establish a testable problem definition and justify an architecture your team can implement within the scope limits.
Submit as one integrated package
• Charter: team members, stakeholder problem, product scope and explicit non-goals.
• Requirements: user stories, use cases and scenarios for at least one simulated persona; functional requirements; and non-functional requirements expressed as testable quality-attribute scenarios. Include the human correction log for the AI requirements draft and a traceability matrix with verified links.
• Architecture: two genuinely distinct options, each with C4 Context and Container diagrams in Mermaid. Show agents, tools and handoffs where applicable. Compare options in a trade-off matrix, show the coupling check, and compute costs using stated usage assumptions and published rates.
• Decision records: at least three Architecture Decision Records (ADRs). Each must name the rejected option, the accepted downside and the related requirement IDs. Supersede an accepted ADR rather than rewriting its history.
• Risk register with measurable alert thresholds and named owners; declared implementation language; and the one-page AI-use disclosure log.
Prepare for the review
Follow the published M1 session instructions for the notebook or live review format. Be ready to answer an instructor-issued quality-attribute scenario from your own requirements, relate it to a named matrix row, and defend your decision. Explain why the alternative was rejected and what downside you accepted. Show your top three risks, cost arithmetic and coupling evidence.
A passing check does not prove the design is risk-free. Explain a residual risk specific to your system that the coupling detector cannot reveal.
Assessment rubric
Criterion
Marks
Two distinct, diagrammed options; distinctness check passes; AI draft compared with the options
3
Computed cost model: stated assumptions, rates re-verified, tokens measured, arithmetic and sensitivity interpreted
5
Coupling detector flags the draft and clears the chosen option; system-specific residual risk explained
4
Three ADRs pass the linter and give specific rejected alternatives and accepted downsides
4
In-session scenario response defended against a named trade-off matrix row
3
Risk thresholds and owners; coherence breaks addressed or explained
1
Requirements and traceability integrated with architecture; scenarios and ADRs traced; no orphan requirements; explicit non-goals
4
Accurate, specific AI-use disclosure consistent with repository evidence
2
Total
26

Keep the evidence in your repository
Retain the charter, requirements and correction log, traceability matrix, architecture diagrams, cost model, coupling report, trade-off matrix, ADR files and risk register. Retain the coherence report and run receipt where required by the M1 session. These records support the final release and oral defense.
M2 and M3 Verification and review
M2 Vertical slice and tests
Week 10  |  25–29 October 2026  |  22 marks  |  23% of the project
Submit the first end-to-end feature or workflow, a review pass, tests and coverage report, before-and-after mutation reports, refactoring regression evidence, peer-contribution round 1 for pairs and the disclosure log. A vertical slice connects the relevant app layers or agent steps into a working path.
Before the session, strengthen tests for surviving mutants and refactor a module under test protection. In the live review, catch an instructor-introduced mutation, show a hollow test before and after repair, and run the suite before and after the refactor. A hollow test passes despite faulty code. Prepare measured AI-versus-manual debugging results and justify accepting or rejecting the AI patch.
M2 criterion
Marks
Suite catches a live instructor-introduced mutation
7
Hollow or bug-locking test identified and repaired, with before-and-after evidence
4
AI patch treated as a candidate; measured comparison reported and defended
3
Live refactor regression check passes before and after
6
Accurate, specific AI-use disclosure consistent with repository evidence
2
Total
22

M3 Review and evaluation
Week 12  |  8–12 November 2026  |  28 marks  |  23% of the project
Submit the QA and peer code review, responses to Week 11 findings, repeated-run AI outputs and pass rate, evaluation scorecard, security evidence, half-page human-override record and disclosure log. Apply the scorecard to another team’s output. Where an exact answer is unavailable, use and explain a partial oracle, such as a metamorphic relation or comparison with another implementation.
For your own repository, show a secret scan, static analysis, verification that every dependency exists and is the intended package, one prompt-injection attempt against the Week 9 agent setup within the authorized sandbox, and decisions on security findings. Show outputs and actions during the review.
At the hearing, a member selected during the session defends one human override under challenge. The half-page record states what the AI proposed, what you chose, the evidence, the quality dimension that failed, and why human judgment was needed. Show repeated outputs side by side and explain two scorecard dimensions to the team you evaluated.
M3 criterion
Marks
Repeated-run variation and stated pass rate shown
4
Two scorecard dimensions presented with evidence
4
Partial oracle used and explained
3
Human override defended orally under challenge
7
Written override record is clear and complete
2
Reviewee accepts, disputes or defends each finding with reasons
2
Accurate, specific AI-use disclosure consistent with repository evidence
2
Own-repository security review demonstrated with evidence
4
Total
28

M4 Release and individual defense
Week 14  |  29 November–3 December 2026  |  100 marks  |  34% of the project
Deliver a working, integrated release candidate supported by accurate documentation and a clear record of human ownership. The final assessment includes a demonstration, a live documentation check and an individual oral defense.
Final submission package
• Release candidate: integrate the slices, complete human-led hardening, resolve security and review findings, and strengthen tests. Keep the test suite and final risk register in the repository.
• Documentation: README, setup guide, API documentation, runbook, consolidated ADRs and honest known limitations. Check setup on a fresh clone, verify API behavior and runbook commands, and reconcile the recorded decisions with what was built. Verify RULES.md or the equivalent project-memory file too.
• Assessment evidence: demonstration, 10-minute engineering brief, individual contribution statement from every member, confidential peer-contribution round 2 for pairs and one-page AI-use disclosure log. Each statement identifies what the member built, their commits and what they reviewed.
The engineering brief replaces the narrative final report. Keep the technical evidence and documentation in the repository.
What happens during assessment
Demo: show the product working end to end against its requirements and state limitations honestly. Documentation drift hunt: the examiner chooses a documented claim, such as a setup step or API response, and your team checks it against the code live.
Engineering brief: give a 10-minute, slide-free walkthrough linking each principle below to one artifact from your own project. It opens the defense and is included in the defense marks.
Principle
Evidence from your project
Specification
A committed SPEC.md written before generation
Grounding
Context manifest, code/source references or retrieval evidence
Review and verification
Mutation report, review findings or measured pass rate
Traceability
Requirements-to-code-to-test links and raw/fix commits
Accountability and agency
Disclosure log and the documented human override

Individual defense: each student explains code and decisions against a specification or ADR, debugs a seeded issue in their own module with AI turned off, and answers questions about submitted work. A teammate cannot earn these marks for you.
Assessment rubric
Criterion
Marks
Working, integrated and hardened release candidate
22
Documentation verified through the live drift hunt
15
Honest demonstration against requirements
15
Individual oral defense, including the durable-principles brief
35
Honest AI-use disclosure and provenance presented orally
8
One-page AI-use disclosure log
2
Individual contribution statement supported by repository and applicable peer evidence
3
Total
100

Prepare from Week 8: explain each module, identify AI suggestions you changed or rejected, predict the effect of a one-line change, fix a bug without AI, and point to a test that verifies the behavior.
Working practices and submission checks
Maintain a reviewable AI workflow
Use one team-owned RULES.md and a SPEC.md for each feature or workflow. Before prompting in DEVAI, specify the goal, Given–When–Then criteria with a failure path and boundary case, constraints, non-goals, input/output and error contracts, worked example, source files, security constraints and tests with an independent oracle.
Use short-lived branches for small units of work. Commit raw AI output separately from human fixes. Never rebase or squash away another member’s raw/fix pair. Resolve merge conflicts in a new human commit that explains the reconciliation; preserve raw commits. Keep attribution and reasoned review decisions.
Set up ignore rules, secret scanning and AI-tool exclusions early. Run tests, lint, builds and CI independently of the assistant. Preserve the Week 9 sandbox configuration and REVIEW.md for later review. Keep requirements, tests, ADRs and the risk register current as the product changes.
Submit one AI disclosure page at every milestone
Use AI_USE_DISCLOSURE.md. Keep records during development. Pairs rotate responsibility for the milestone log; individual students maintain their own. Extensive AI use is acceptable when disclosed, reviewed and verified. Each log earns up to 2 marks.
• Tools and contribution: DEVAI and the model used, mode and purpose; AI contribution by area using none, minor, substantial or primary.
• Errors and rejections: at least one AI error, how you detected and corrected it, and a rejected suggestion with the reason.
• Provenance: raw/fix commits, attribution or Co-authored-by trailers, and the named member who read each generated file.
• Data and licensing: confirm data boundaries, identify attribution and license handling, verify dependencies and cite retrieved sources.
• Individual ownership: each member signs “I can explain and defend every part of this submission that carries my name” and identifies their areas.
• Cost at M3 and M4: approximate tokens/requests and cost, the estimation method and one way to reduce it.
Contribution and academic integrity
For two-member teams, at M2 and M4 confidentially allocate 100 contribution points across both members, including yourself, with justifications. Review uses repository evidence and consistent peer reports. Moderation follows the published syllabus; the project brief describes up to ±15%. Solo students submit their contribution statement; within-team peer allocation does not apply.
Three pass conditions apply under the approved published syllabus: visible repository contribution, ability to explain and defend submitted work, and no committed live secrets or real private data. Failure may result in a failing grade regardless of the numerical average. Synthetic fixtures and fake values in .env.example are acceptable. Never send secrets, personal data or unapproved proprietary material to an AI tool. Respect licensing and disclose AI use honestly.
Live assessment and final checks
Any member may be selected to answer. Show claims running or in repository evidence; if a tool fails, use repository evidence and answer the same questions. Initiate a missed-assessment make-up within seven calendar days: a recorded demonstration, or an office-hours demonstration if recording is declined, plus live questions. Later make-ups require documented cause and department approval. Initiate grade appeals in writing within ten working days through the course coordinator, then department head and college examination committee.
Before each milestone: check the scope cap; verify that every required artifact and link is available; run the relevant checks; reconcile review findings; complete the disclosure page; and ensure every member can explain the package. Follow the published submission instructions and retain the engineering evidence for M4.
