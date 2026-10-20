/* ─────────────────────────────────────────────
   노트 위브 · 설정 파일
   ───────────────────────────────────────────── */
window.ST_CONFIG = {
  // ▼ 여러 사람이 실시간으로 결과를 공유하려면 Firebase Realtime Database 주소를 넣으세요.
  //   예) "https://my-project-default-rtdb.asia-southeast1.firebasedatabase.app"
  //   비워 두면 '단독 모드'(이 브라우저에만 저장 + 샘플 참가자 12명 표시)로 동작합니다.
  //   설정 방법은 README.md 의 "실시간 공유 켜기" 를 참고하세요.
  firebaseUrl: "",

  // 데이터베이스 안에서 이 프로그램이 사용하는 최상위 폴더 이름
  root: "note-weave",

  // 처음 접속했을 때 기본으로 들어가는 방(수업) 코드. ?room=HR2026 처럼 주소로도 지정할 수 있어요.
  defaultRoom: "CLASS"
};
