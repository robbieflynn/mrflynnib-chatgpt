import Link from "next/link";
import type { Curriculum } from "@/lib/account-access";
import styles from "./school-access-invitation.module.css";

export function SchoolAccessInvitation({ curriculum, audience = "student" }: {
  curriculum: Curriculum;
  audience?: "student" | "teacher";
}) {
  return <section className={styles.invitation} aria-labelledby="school-access-invitation-heading">
    <div>
      <h2 id="school-access-invitation-heading">Bring Plus to your school</h2>
      <p>{audience === "teacher"
        ? "Support your students with complete video courses and extra lesson practice, alongside your classroom tools. Explore school access with your head of department."
        : "Help your whole class learn with complete video lessons and extra practice. Share our school options with your maths teacher or head of department."}</p>
    </div>
    <Link className="button button-secondary" href={curriculum === "igcse" ? "/igcse/schools" : "/schools"}>Get school access <span aria-hidden="true">→</span></Link>
  </section>;
}
