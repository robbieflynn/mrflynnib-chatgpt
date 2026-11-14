import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
for (const file of ['public/learn/app.js', 'course-platform-pilot/dist/app.js']) {
  const source = fs.readFileSync(file, 'utf8');
  const bootstrap = source.slice(source.indexOf('async function bootstrapAccount()'), source.indexOf('\nasync function initialize()'));
  for (const curriculum of ['ib', 'igcse']) for (const role of ['student', 'teacher', 'admin']) {
    for (const paid of [false, true]) for (const saved of [null, 'locked', 'sample-2', 'missing']) {
      const id = curriculum === 'ib' ? 'aa-hl' : 'igcse';
      const lessons = [{ id: 'locked', topic: 1 }, { id: 'sample-1', topic: 1 }, { id: 'sample-2', topic: 2 }];
      const account = { curriculum, availableCourseIds: [id], ownedCourseIds: paid ? [id] : [], preferredCourseId: id, state: { last_course_id: id, last_lesson_id: saved }, user: { role, initials: 'QA' }, links: { access: '/account/access', account: curriculum === 'igcse' ? '/igcse/account' : '/account', assignments: '/assignments' }, progress: [] };
      const node = () => ({ classList: { remove() {}, toggle() {}, add() {} } });
      const context = vm.createContext({ reviewerMode:false, validPreviewCourseId:null, requestedCurriculum:curriculum, requestedCourseId:null, platformAccount:null, courses:{ [id]:{id,code:id,lessons} }, courseDefinitions:[{id}], enrolledCourseIds:[], ownedCourseIds:[], state:{lastLesson:saved,completed:[]}, accountButton:node(), document:{getElementById:node,querySelector:node}, fetch:async()=>({ok:true,status:200,json:async()=>account}), configureGuestExperience(){throw new Error('Unexpected guest fallback');}, showToast(){throw new Error('Unexpected bootstrap failure');}, saveState(){}, syncQuestionBankLink(){}, configureTeacherCourseSwitcher(){}, renderAccountHeader(){}, flushLessonProgress:async()=>{}, salesPreviewLessons:()=>lessons.slice(1) });
      vm.runInContext('function hasCompleteCourseAccess(course) { return ownedCourseIds.includes(course.id); } function getCurrentLesson() { return currentCourse.lessons.find(l=>l.id===currentLessonId); }',context);
      vm.runInContext(bootstrap,context);
      await context.bootstrapAccount();
      const expected = paid ? lessons.some(l=>l.id===saved) ? saved : 'locked' : saved === 'sample-2' ? saved : 'sample-1';
      assert.equal(context.currentLessonId,expected,`${file}: ${curriculum}/${role}/${paid}/${saved}`);
      assert.equal(context.state.lastLesson,expected);
      assert.equal(context.currentTopic,expected === 'sample-2' ? 2 : 1);
    }
  }
}
console.log('PASS: authenticated student/teacher/admin entry, unpaid sample defaults, locked/invalid history, paid resume and IB/IGCSE isolation in both player copies.');
