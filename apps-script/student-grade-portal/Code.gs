/**
 * 학생 성적 확인 웹앱 (Google Apps Script)
 *
 * - 학생이 학번 + 이름(+ 선택: 비밀번호)으로 로그인하면
 *   1) 문항별 점수와 총점(한 행 표)
 *   2) 전체 평균, 표준편차, 히스토그램(본인 구간 강조)
 *   3) "나머지 평가가 모두 100점일 때" 가능한 최고 등급 안내
 *   4) 본인의 답안 PDF(iframe)
 *   를 보여 준다.
 *
 * - 다른 학생의 개별 점수는 절대 브라우저로 보내지 않는다(통계·구간 개수만 전송).
 *
 * - 관리자(기본: 학번 00000, 이름 관리자)로 로그인하면 왼쪽 학생 목록에서
 *   학생을 골라 각 학생이 보는 화면 그대로 확인할 수 있다.
 *   스크립트 속성 ADMIN_PASSWORD 를 설정하면 관리자 비밀번호도 확인한다.
 */

/* =========================================================================
 * 설정
 * ========================================================================= */
var CONFIG = {
  // 성적 스프레드시트 ID (URL의 /d/와 /edit 사이)
  SPREADSHEET_ID: '1Xwjj_j3TdwcMBkyz_lWyKV_Es5mofajOFb8m0gM6Wns',
  // 성적이 들어 있는 시트 이름
  SHEET_NAME: '학생성적',
  // 학번_이름.pdf 파일이 들어 있는 드라이브 폴더 ID
  PDF_FOLDER_ID: '1nCPxZREoydsxfrnOUsKdEVIKTl4u_hwH',

  // 화면 제목 (비워 두면 스프레드시트 파일 이름 사용)
  EXAM_TITLE: '',

  // 히스토그램 구간 크기(점)와 만점
  BIN_SIZE: 10,
  MAX_SCORE: 100,

  // "나머지가 모두 100점이면" 가능한 등급 기준 (높은 등급부터)
  GRADE_GUIDE: [
    { grade: 'A', min: 67 },
    { grade: 'B', min: 34 },
    { grade: 'C', min: 0 }
  ],

  // (선택) 비밀번호 확인용 시트 이름. 비워 두면 학번 + 이름만으로 로그인.
  //   시트 형식: 1행 머리글 [학번 | 비밀번호], 2행부터 데이터
  PASSWORD_SHEET_NAME: '',

  // 관리자 로그인 정보. 비밀번호는 코드에 적지 말고
  //   [프로젝트 설정 → 스크립트 속성]에 ADMIN_PASSWORD 로 저장한다(선택).
  ADMIN_ID: '00000',
  ADMIN_NAME: '관리자',

  // 로그인 실패 제한: 같은 학번으로 MAX_FAILS회 실패하면 LOCK_SECONDS 동안 잠금
  MAX_FAILS: 5,
  LOCK_SECONDS: 600,

  // PDF 폴더 목록 캐시 시간(초)
  PDF_CACHE_SECONDS: 600
};

/* =========================================================================
 * 웹앱 진입점
 * ========================================================================= */
function doGet() {
  var template = HtmlService.createTemplateFromFile('Index');
  template.examTitle = getExamTitle_();
  template.requirePassword = !!CONFIG.PASSWORD_SHEET_NAME;
  template.adminId = CONFIG.ADMIN_ID;
  template.adminNeedsPassword = !!getAdminPassword_();

  return template.evaluate()
    .setTitle(template.examTitle + ' 성적 확인')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/** HTML 파일 안에서 <?!= include('파일명'); ?> 로 다른 HTML 파일을 끼워 넣는다. */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/* =========================================================================
 * 클라이언트에서 google.script.run 으로 호출하는 함수
 * ========================================================================= */

/**
 * 학번·이름(·비밀번호)을 확인하고 성적 리포트를 돌려준다.
 * - 학생: { mode: 'student', report }
 * - 관리자: { mode: 'admin', students: [목록], reports: { 학번: report } }
 * @param {{studentId: string, name: string, password: string}} form
 */
function getStudentReport(form) {
  form = form || {};
  var studentId = String(form.studentId || '').replace(/\D/g, '');
  var name = normalizeName_(form.name);

  if (!studentId || !name) {
    throw new Error('학번과 이름을 모두 입력해 주세요.');
  }

  checkNotLocked_(studentId);

  if (studentId === CONFIG.ADMIN_ID) {
    return getAdminReports_(name, form.password);
  }

  var data = readGradeSheet_();
  var me = null;
  for (var i = 0; i < data.students.length; i++) {
    var s = data.students[i];
    if (s.studentId === studentId && normalizeName_(s.name) === name) {
      me = s;
      break;
    }
  }

  if (!me || (CONFIG.PASSWORD_SHEET_NAME && !checkPassword_(studentId, form.password))) {
    recordFail_(studentId);
    // 어떤 항목이 틀렸는지 알려 주지 않는다.
    throw new Error('입력한 정보와 일치하는 학생이 없습니다. ' +
      (CONFIG.PASSWORD_SHEET_NAME ? '학번·이름·비밀번호를' : '학번과 이름을') + ' 확인해 주세요.');
  }
  clearFails_(studentId);

  var totals = data.students.map(function (st) { return st.total; });
  return {
    mode: 'student',
    report: buildReport_(data, me, totals, computeStats_(totals))
  };
}

/** 관리자 확인 후 전체 학생 목록과 학생별 리포트를 한 번에 돌려준다. */
function getAdminReports_(name, password) {
  var adminPassword = getAdminPassword_();
  var ok = name === normalizeName_(CONFIG.ADMIN_NAME) &&
    (!adminPassword || String(password || '') === adminPassword);
  if (!ok) {
    recordFail_(CONFIG.ADMIN_ID);
    throw new Error('관리자 정보가 일치하지 않습니다.');
  }
  clearFails_(CONFIG.ADMIN_ID);

  var data = readGradeSheet_();
  var totals = data.students.map(function (s) { return s.total; });
  var stats = computeStats_(totals);

  var students = data.students.slice().sort(function (a, b) {
    return a.studentId < b.studentId ? -1 : a.studentId > b.studentId ? 1 : 0;
  });

  var reports = {};
  var list = students.map(function (s) {
    var report = buildReport_(data, s, totals, stats);
    reports[s.studentId] = report;
    return {
      studentId: s.studentId,
      name: s.name,
      total: s.total,
      reachableGrade: report.guide.reachableGrade,
      hasPdf: !!report.pdf
    };
  });

  return {
    mode: 'admin',
    examTitle: getExamTitle_(),
    stats: stats,
    students: list,
    reports: reports
  };
}

/** 한 학생에 대한 리포트(학생 화면에 그대로 쓰이는 데이터) */
function buildReport_(data, me, totals, stats) {
  return {
    examTitle: getExamTitle_(),
    student: {
      studentId: me.studentId,
      name: me.name,
      grade: me.grade,
      classNo: me.classNo,
      number: me.number
    },
    questions: data.questions,   // [{label, max}]
    scores: me.scores,           // 문항별 점수(숫자 또는 null)
    total: me.total,
    totalMax: data.totalMax,
    stats: stats,                // {count, mean, sd, max, min}
    histogram: buildHistogram_(totals, me.total), // {bins:[{from,to,label,count,mine}], binSize}
    guide: buildGradeGuide_(me.total),
    pdf: findStudentPdf_(me.studentId, me.name)   // {fileId, name, previewUrl, viewUrl} 또는 null
  };
}

/* =========================================================================
 * 시트 읽기
 * ========================================================================= */

/**
 * 성적 시트를 읽어 문항 정보와 학생 목록을 돌려준다.
 * 머리글 행('총합'이 있는 행)과 배점 행('배점'이 있는 행)을 자동으로 찾는다.
 */
function readGradeSheet_() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    throw new Error('성적 시트(' + CONFIG.SHEET_NAME + ')를 찾을 수 없습니다. 선생님께 문의해 주세요.');
  }

  var values = sheet.getDataRange().getValues();
  var display = sheet.getDataRange().getDisplayValues();

  // 1) 머리글 행 찾기: '총합'(또는 '총점')이 있는 행
  var headerRow = -1;
  var col = {};
  for (var r = 0; r < display.length && headerRow < 0; r++) {
    for (var c = 0; c < display[r].length; c++) {
      var h = compact_(display[r][c]);
      if (h === '총합' || h === '총점') {
        headerRow = r;
        break;
      }
    }
  }
  if (headerRow < 0) {
    throw new Error('성적 시트에서 "총합" 머리글을 찾을 수 없습니다.');
  }

  display[headerRow].forEach(function (cell, c) {
    var h = compact_(cell);
    if (h === '학년' && col.grade === undefined) col.grade = c;
    else if (h === '반' && col.classNo === undefined) col.classNo = c;
    else if (h === '번호' && col.number === undefined) col.number = c;
    else if ((h === '성명' || h === '이름') && col.name === undefined) col.name = c;
    else if ((h === '총합' || h === '총점') && col.total === undefined) col.total = c;
  });
  ['grade', 'classNo', 'number', 'name', 'total'].forEach(function (k) {
    if (col[k] === undefined) {
      throw new Error('성적 시트 머리글(학년/반/번호/성명/총합)을 확인해 주세요.');
    }
  });

  // 2) 배점 행 찾기: 머리글 위쪽에서 '배점'이 적힌 행
  var maxRow = -1;
  for (var mr = 0; mr < headerRow; mr++) {
    if (display[mr].some(function (cell) { return compact_(cell) === '배점'; })) {
      maxRow = mr;
      break;
    }
  }

  // 3) 문항 열: 성명 열과 총합 열 사이에서 머리글이 비어 있지 않은 열
  var questions = [];
  for (var qc = col.name + 1; qc < col.total; qc++) {
    var label = String(display[headerRow][qc]).trim();
    if (!label) continue;
    questions.push({
      col: qc,
      label: label,
      max: maxRow >= 0 ? toNumber_(values[maxRow][qc]) : null
    });
  }

  var totalMax = maxRow >= 0 ? toNumber_(values[maxRow][col.total]) : null;
  if (totalMax === null) totalMax = CONFIG.MAX_SCORE;

  // 4) 학생 행
  var students = [];
  for (var sr = headerRow + 1; sr < values.length; sr++) {
    var row = values[sr];
    var name = String(display[sr][col.name]).trim();
    var grade = toNumber_(row[col.grade]);
    var classNo = toNumber_(row[col.classNo]);
    var number = toNumber_(row[col.number]);
    if (!name || grade === null || classNo === null || number === null) continue;

    var scores = questions.map(function (q) { return toNumber_(row[q.col]); });
    var total = toNumber_(row[col.total]);
    if (total === null) {
      // 총합 칸이 비어 있으면 문항 점수 합으로 대신한다.
      total = scores.reduce(function (sum, v) { return sum + (v || 0); }, 0);
    }

    students.push({
      studentId: makeStudentId_(grade, classNo, number),
      name: name,
      grade: grade,
      classNo: classNo,
      number: number,
      scores: scores,
      total: total
    });
  }

  if (!students.length) {
    throw new Error('성적 시트에 학생 데이터가 없습니다.');
  }

  return {
    questions: questions.map(function (q) { return { label: q.label, max: q.max }; }),
    totalMax: totalMax,
    students: students
  };
}

/* =========================================================================
 * 통계 · 히스토그램 · 등급 안내
 * ========================================================================= */

/** 평균과 표준편차. 표준편차는 시트의 STDEV(표본 표준편차)와 같은 방식. */
function computeStats_(totals) {
  var n = totals.length;
  var mean = totals.reduce(function (a, b) { return a + b; }, 0) / n;
  var sq = totals.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0);
  var sd = n > 1 ? Math.sqrt(sq / (n - 1)) : 0;
  return {
    count: n,
    mean: round_(mean, 2),
    sd: round_(sd, 2),
    max: Math.max.apply(null, totals),
    min: Math.min.apply(null, totals)
  };
}

/** BIN_SIZE 단위 구간별 인원 수. 마지막 구간은 만점을 포함한다(예: 90~100). */
function buildHistogram_(totals, myTotal) {
  var size = CONFIG.BIN_SIZE;
  var max = CONFIG.MAX_SCORE;
  var binCount = Math.ceil(max / size);
  var bins = [];
  for (var i = 0; i < binCount; i++) {
    var from = i * size;
    var to = Math.min(from + size, max);
    var last = i === binCount - 1;
    bins.push({
      from: from,
      to: to,
      label: from + '~' + (last ? to : to - 1),
      count: 0,
      mine: false
    });
  }
  function indexOf(score) {
    var idx = Math.floor(score / size);
    return Math.max(0, Math.min(binCount - 1, idx));
  }
  totals.forEach(function (t) { bins[indexOf(t)].count++; });
  bins[indexOf(myTotal)].mine = true;
  return { binSize: size, bins: bins };
}

/** 현재 점수로 "나머지가 모두 100점이면" 도달 가능한 최고 등급. */
function buildGradeGuide_(total) {
  var tiers = CONFIG.GRADE_GUIDE.slice().sort(function (a, b) { return b.min - a.min; });
  var reachable = null;
  for (var i = 0; i < tiers.length; i++) {
    if (total >= tiers[i].min) {
      reachable = tiers[i];
      break;
    }
  }
  return {
    tiers: tiers.map(function (t) {
      return { grade: t.grade, min: t.min, mine: !!reachable && t.grade === reachable.grade };
    }),
    reachableGrade: reachable ? reachable.grade : null
  };
}

/* =========================================================================
 * PDF 찾기
 * ========================================================================= */

/**
 * PDF 폴더에서 '학번_이름.pdf' 파일을 찾는다.
 * 이름 표기가 조금 달라도(공백, 맥 NFD 한글 등) 학번으로 다시 찾는다.
 */
function findStudentPdf_(studentId, name) {
  var index = getPdfIndex_();
  var wanted = normalizeName_(studentId + '_' + name + '.pdf');
  var hit = null;

  for (var i = 0; i < index.length; i++) {
    if (normalizeName_(index[i].name) === wanted) { hit = index[i]; break; }
  }
  if (!hit) {
    var prefix = studentId + '_';
    var byId = index.filter(function (f) { return normalizeName_(f.name).indexOf(prefix) === 0; });
    if (byId.length === 1) hit = byId[0];
  }
  if (!hit) return null;

  return {
    fileId: hit.id,
    name: hit.name,
    previewUrl: 'https://drive.google.com/file/d/' + hit.id + '/preview',
    viewUrl: 'https://drive.google.com/file/d/' + hit.id + '/view'
  };
}

/** 폴더의 PDF 목록 [{id, name}] (CacheService로 잠시 저장) */
function getPdfIndex_() {
  var cache = CacheService.getScriptCache();
  var key = 'pdfIndex:' + CONFIG.PDF_FOLDER_ID;
  var cached = cache.get(key);
  if (cached) return JSON.parse(cached);

  var list = [];
  var files = DriveApp.getFolderById(CONFIG.PDF_FOLDER_ID).getFilesByType(MimeType.PDF);
  while (files.hasNext()) {
    var f = files.next();
    list.push({ id: f.getId(), name: f.getName() });
  }
  try {
    cache.put(key, JSON.stringify(list), CONFIG.PDF_CACHE_SECONDS);
  } catch (e) {
    // 목록이 캐시 한도(100KB)를 넘으면 캐시 없이 사용
  }
  return list;
}

/* =========================================================================
 * 로그인 보조 (비밀번호 · 실패 횟수 제한)
 * ========================================================================= */

function checkPassword_(studentId, password) {
  var sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.PASSWORD_SHEET_NAME);
  if (!sheet) throw new Error('비밀번호 시트(' + CONFIG.PASSWORD_SHEET_NAME + ')를 찾을 수 없습니다.');
  var rows = sheet.getDataRange().getDisplayValues();
  var input = String(password || '').trim();
  for (var r = 1; r < rows.length; r++) {
    if (String(rows[r][0]).replace(/\D/g, '') === studentId) {
      return input !== '' && String(rows[r][1]).trim() === input;
    }
  }
  return false;
}

/** 스크립트 속성 ADMIN_PASSWORD (없으면 빈 문자열) */
function getAdminPassword_() {
  return PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD') || '';
}

function checkNotLocked_(studentId) {
  var fails = Number(CacheService.getScriptCache().get('fail:' + studentId) || 0);
  if (fails >= CONFIG.MAX_FAILS) {
    throw new Error('로그인 실패가 많아 잠시 잠겼습니다. ' +
      Math.round(CONFIG.LOCK_SECONDS / 60) + '분 뒤에 다시 시도해 주세요.');
  }
}

function recordFail_(studentId) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    var cache = CacheService.getScriptCache();
    var key = 'fail:' + studentId;
    var fails = Number(cache.get(key) || 0) + 1;
    cache.put(key, String(fails), CONFIG.LOCK_SECONDS);
  } finally {
    lock.releaseLock();
  }
}

function clearFails_(studentId) {
  CacheService.getScriptCache().remove('fail:' + studentId);
}

/* =========================================================================
 * 교사용 도구 (스프레드시트에 바인딩된 경우 메뉴로 표시)
 * ========================================================================= */

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('성적 확인 웹앱')
      .addItem('PDF 링크 공유 켜기 (iframe 표시용)', 'sharePdfsWithLink')
      .addItem('학생-PDF 매칭 점검', 'checkPdfMatching')
      .addItem('PDF 목록 캐시 비우기', 'clearPdfCache')
      .addToUi();
  } catch (e) {
    // 독립형 스크립트에서는 UI가 없으므로 무시
  }
}

/**
 * 폴더 안 PDF를 '링크가 있는 모든 사용자: 뷰어'로 설정한다.
 * iframe의 드라이브 미리보기는 학생 브라우저가 직접 불러오므로 이 설정이 필요하다.
 * (파일 ID는 로그인에 성공한 본인에게만 전달된다.)
 */
function sharePdfsWithLink() {
  var files = DriveApp.getFolderById(CONFIG.PDF_FOLDER_ID).getFilesByType(MimeType.PDF);
  var changed = 0, total = 0, failed = [];
  while (files.hasNext()) {
    var f = files.next();
    total++;
    try {
      if (f.getSharingAccess() !== DriveApp.Access.ANYONE_WITH_LINK ||
          f.getSharingPermission() !== DriveApp.Permission.VIEW) {
        f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        changed++;
      }
    } catch (e) {
      failed.push(f.getName() + ' (' + e.message + ')');
    }
  }
  var msg = 'PDF ' + total + '개 중 ' + changed + '개의 공유 설정을 변경했습니다.' +
    (failed.length ? '\n실패:\n' + failed.join('\n') : '');
  notify_(msg);
}

/** 시트의 학생마다 PDF가 있는지 확인하고, 매칭되지 않은 학생/파일을 알려 준다. */
function checkPdfMatching() {
  clearPdfCache();
  var data = readGradeSheet_();
  var index = getPdfIndex_();
  var used = {};
  var missing = [];
  data.students.forEach(function (s) {
    var pdf = findStudentPdf_(s.studentId, s.name);
    if (pdf) used[pdf.fileId] = true;
    else missing.push(s.studentId + '_' + s.name);
  });
  var orphan = index.filter(function (f) { return !used[f.id]; }).map(function (f) { return f.name; });
  var msg = '학생 ' + data.students.length + '명 / PDF ' + index.length + '개\n\n' +
    'PDF가 없는 학생: ' + (missing.length ? '\n' + missing.join('\n') : '없음') + '\n\n' +
    '어느 학생과도 매칭되지 않은 PDF: ' + (orphan.length ? '\n' + orphan.join('\n') : '없음');
  notify_(msg);
}

function clearPdfCache() {
  CacheService.getScriptCache().remove('pdfIndex:' + CONFIG.PDF_FOLDER_ID);
}

/** 편집기에서 실행해 첫 학생의 리포트를 로그로 확인하는 테스트 함수 */
function testFirstStudentReport() {
  var s = readGradeSheet_().students[0];
  var report = getStudentReport({ studentId: s.studentId, name: s.name, password: '' });
  Logger.log(JSON.stringify(report, null, 2));
}

/* =========================================================================
 * 유틸
 * ========================================================================= */

function getExamTitle_() {
  if (CONFIG.EXAM_TITLE) return CONFIG.EXAM_TITLE;
  if (getExamTitle_.cached === undefined) {
    getExamTitle_.cached = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getName();
  }
  return getExamTitle_.cached;
}

/** 학년(1자리) + 반(2자리) + 번호(2자리). 예) 2학년 8반 8번 → 20808 */
function makeStudentId_(grade, classNo, number) {
  return String(grade) + pad2_(classNo) + pad2_(number);
}

function pad2_(n) {
  return ('0' + n).slice(-2);
}

/** 한글 정규화(NFC) + 공백 제거 + 소문자 */
function normalizeName_(s) {
  return String(s || '').normalize('NFC').replace(/\s+/g, '').toLowerCase();
}

/** 머리글 비교용: 공백 제거 */
function compact_(s) {
  return String(s || '').replace(/\s+/g, '');
}

function toNumber_(v) {
  if (v === '' || v === null || v === undefined) return null;
  var n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, '').trim());
  return isFinite(n) ? n : null;
}

function round_(n, digits) {
  var p = Math.pow(10, digits);
  return Math.round(n * p) / p;
}

function notify_(msg) {
  Logger.log(msg);
  try {
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {
    // 편집기에서 직접 실행한 경우 로그로만 확인
  }
}
