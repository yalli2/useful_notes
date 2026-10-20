# 노트 위브 (Note Weave)

> 흩어진 메모를 엮어, 쓸모 있는 지식으로 — HR 성인 학습 프로그램

Edmund Gröpl의 『Make Useful Notes』(제텔카스텐 · 스케치노트 · 옵시디언)를 바탕으로 만든 **11개 챕터** 인터랙티브 사이트입니다. 챕터마다 배우기 → 실습하기 → 함께 보기로 진행하며, 참가자 모두의 결과가 레이더·히트맵·연결망·노트 카드·퀴즈 정답률·칸반 등으로 모입니다.

| 장 | 챕터 | 교재 파트 |
|---|---|---|
| 1 | 노트는 왜 쓰는가 | INTRODUCTION |
| 2 | 네트워크 마인드셋과 4가지 가치 | START FROM PROVEN CONCEPTS |
| 3 | 제텔카스텐 프레임워크와 12원칙 | Framework · 12 Principles |
| 4 | 여섯 가지 노트 유형 | Unlimited Zettelkasten Practices |
| 5 | 영구 노트 쓰기 | Fleeting · Literature · Permanent |
| 6 | 세 걸음 워크플로와 지식의 흐름 | BUILD UP YOUR WORKFLOW |
| 7 | 링크와 태그로 연결망 짜기 | Use Links · Use Tags |
| 8 | 산출물과 습관 | Output · Bullet Journal · Kanban · Outline Wall |
| 9 | 복습 · 점검 · 개선 | Review · Inspect · Pitfalls |
| 10 | 도구와 스케치로 아이디어 잇기 | Tools · Canvas · Draw Ideas |
| 11 | 함께 배우고 실험하기 | Communities · Experiments |

## 게시 (GitHub Pages)
Settings → Pages → Branch: `main` / root. 주소: `https://yalli2.github.io/useful_notes/`

## 실시간 공유 켜기 (Firebase, 무료)
기본은 **단독 모드**(이 브라우저에만 저장, 샘플 참가자 12명 표시)입니다. 여러 사람이 함께 보려면:
1. Firebase 콘솔에서 프로젝트 → **Realtime Database** 생성
2. Rules에 붙여 넣기
```json
{ "rules": { "note-weave": { "$room": { ".read": true, ".write": true } } } }
```
3. 데이터베이스 주소를 `config.js`의 `firebaseUrl`에 입력 후 커밋
4. 수업마다 `?room=HR2026` 처럼 방 코드를 달리하면 반별로 분리됩니다.

개인정보·민감정보는 입력하지 않도록 안내해 주세요.

## 저작권
교재의 문장·그림을 옮기지 않고, 설명·도해·실습 문항을 학습용으로 새로 작성했습니다. 원문과 삽화의 저작권은 저자에게 있습니다.
