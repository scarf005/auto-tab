# Tab Console

Firefox MV2용 로컬 Tab REPL + Tab Explorer입니다. 좌측에서 WebExtension API를 JavaScript로 직접
조작하고, 우측에서는 같은 상태를 UI로 조회·필터·정렬·그룹화하고 일괄 작업할 수 있습니다.

## 설치

개발 설치:

1. `about:debugging#/runtime/this-firefox`를 엽니다.
2. **Load Temporary Add-on…**을 누릅니다.
3. 이 저장소의 `dist/manifest.json`을 선택합니다.
4. 툴바 아이콘 또는 `Alt+Shift+T`로 Tab Console을 엽니다.

`dist/`는 저장소에 포함되어 있으므로 Deno 없이 설치할 수 있습니다.

## 개발

Deno 프로젝트입니다. `vendor/`, `node_modules/`, `package.json`을 저장소에 두지 않습니다.
CodeMirror는 `deno.json`의 npm specifier로 관리하고 `deno bundle --platform=browser`가 한 파일에
묶습니다.

```sh
deno task build
deno task check
deno task test
deno task package
```

빌드 결과는 `dist/`, 패키징 결과는 `tab-console-firefox-mv2-0.3.0.xpi`입니다.

## UI ↔ REPL 동기화

우측 필터가 바뀌면 좌측 코드는 다음 형태로 갱신됩니다.

```js
await ui.query({
  "search": "hada",
  "field": "url",
})
```

좌측 코드를 사용자가 수정하면 자동 덮어쓰기를 중지합니다. **UI → 쿼리** 버튼을 누르면 우측 상태로
다시 생성합니다. `ui.query(...)`를 REPL에서 실행하면 우측 UI도 변경됩니다.

REPL 전역:

```js
$tabs
$selected
$_
await tabs()
await close($tabs)
await discard($selected)
await ui.query({ search: "linear", field: "url", ignorePinned: true })
console.table($tabs)
browser.tabs.query({})
```

## 필터 / 정렬

검색 입력은 180 ms debounce를 사용합니다. 문자열/Regex, Title/URL/Domain, 현재 창/모든 창, 상태,
마지막 접근 시간, 고정 탭 무시, 내장·사용자 프리셋을 조합할 수 있습니다.

정렬은 최근 접근, 오래된 접근, 상태, 도메인, 제목, 창/탭 순서를 지원합니다. 그룹화는
도메인/창/상태를 지원하며 그룹 이름, 개수, 최근 접근, 오래된 접근 기준으로 그룹 순서를 정할 수
있습니다.

## Close shown / Close selected

- **조회 결과 닫기 / Close shown**: 현재 필터 결과 전체를 닫습니다. 체크 여부는 사용하지 않습니다.
- **선택 항목 닫기 / Close selected**: 체크박스로 선택한 탭만 닫습니다.

`Ignore pinned`가 켜져 있으면 고정 탭은 조회 결과에서 빠지므로 `Close shown`과 선택 일괄 작업
대상에도 들어가지 않습니다.

## 테마 / 언어

기본 테마는 Light입니다. 헤더 버튼 또는 Settings에서 Light/Dark를 전환할 수 있습니다. 한국어와 영어
UI를 제공합니다.

## CodeMirror 격리

확장에는 `content_scripts`와 `tabs.executeScript`가 없습니다. CodeMirror는 확장 페이지 번들 안에서만
생성하며 npm 의존성은 Deno가 한 번만 번들합니다. 빌드된 런타임에는 `window.CodeMirror` 전역을 남기지
않습니다. 웹페이지의 CodeMirror 인스턴스나 `@codemirror/state` 모듈 그래프와 공유되는 코드 경로가
없습니다.

## 권한

- `tabs`: 탭 URL/제목 조회 및 탭 작업
- `storage`: 확장 설정용

웹페이지 DOM에 접근하는 host permission은 요청하지 않습니다.
