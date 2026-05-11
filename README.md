# Fmkorea Preview - 에펨코리아 게시글 미리보기

에펨코리아(fmkorea.com) 게시글을 페이지 이동 없이 우클릭으로 미리볼 수 있는 Chrome 확장 프로그램입니다.

[Chrome Web Store에서 설치하기](https://chromewebstore.google.com/detail/fmkorea-preview-%EC%97%90%ED%8E%A8%EC%BD%94%EB%A6%AC%EC%95%84-%EA%B2%8C%EC%8B%9C%EA%B8%80/bboddojafohhhnbdifnlmmmbfngjldhf?authuser=0&hl=ko)

## 사용법

에펨코리아 게시글 제목에서 **우클릭** → 미리보기 팝업이 나타납니다.  
ESC 키 또는 팝업 바깥 클릭으로 닫습니다.

## 기능

- 본문 내용 (이미지, 영상 포함)
- 추천 / 비추천
- 댓글 목록 및 페이지네이션
- 댓글 작성 및 댓글 추천/비추천
- BEST 댓글 강조 표시
- 작성자 클릭 → 쪽지 보내기, 회원 정보, 작성 글, 블라인드
- 미디어 자동 임베드 (YouTube, 치지직, 숲, Twitter/X, Instagram)
- 일반 URL 자동 링크 변환

## 기술 스택

- [Plasmo](https://www.plasmo.com/)
- React
- Tailwind CSS
- TypeScript

## 개발

```bash
bun install
bun run dev
```

## 빌드

```bash
bun run build
bun run package
# build/chrome-mv3-prod.zip 생성됨
```
