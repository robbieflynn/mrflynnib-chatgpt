"use client";

export function SchoolTierLink({ students }: { students: string }) {
  function selectTier() {
    window.setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>("#studentCount");
      if (!input) return;
      input.value = students;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus({ preventScroll: true });
    }, 0);
  }

  return <a href="#school-enquiry" className="text-link" onClick={selectTier}>Request this option</a>;
}
