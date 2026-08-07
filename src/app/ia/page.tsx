import Image from "next/image";
import type { Metadata } from "next";
import { Breadcrumbs, ButtonLink, Container, Eyebrow } from "@/components/ui";
import { VideoEmbed } from "@/components/video-embed";

export const metadata: Metadata = { title: "IB Mathematics IA guidance", description: "Free IB Mathematics IA video guides, IA ideas and Mr Flynn IB's complete Internal Assessment book." };

export default function IAPage() {
  return (
    <>
      <section className="ia-page-hero">
        <Container className="ia-page-hero-grid">
          <div className="stack-lg"><Breadcrumbs items={[{ label: "IA guidance" }]} /><Eyebrow>Internal Assessment</Eyebrow><h1>Build an IA you understand and can explain.</h1><p className="lede">Mr Flynn IB&apos;s IA guidance is used by students and teachers around the world. Start with the complete free guide, explore mathematical ideas and use the book when you want the whole process beside you.</p><div className="cluster"><ButtonLink href="#videos">Watch the free guides</ButtonLink><ButtonLink href="/book" secondary>Explore the book</ButtonLink></div></div>
          <div className="ia-hero-book"><Image src="/images/ib-mathematics-ia-book-cover.jpg" alt="IB Mathematics IA book by Robert Flynn" width={385} height={544} priority /><div><strong>320</strong><span>pages of practical IA guidance</span></div></div>
        </Container>
      </section>

      <section className="ia-principles"><Container className="grid-3"><article><span>01</span><h3>Understand the criteria</h3><p>Know what the assessment is asking you to demonstrate before you begin writing.</p></article><article><span>02</span><h3>Choose purposeful mathematics</h3><p>Develop an idea that gives you room to explore, interpret and communicate mathematics well.</p></article><article><span>03</span><h3>Explain your decisions</h3><p>Make the exploration genuinely yours by showing the reasoning behind each mathematical choice.</p></article></Container></section>

      <section id="videos" className="section ia-video-section">
        <Container className="stack-xl">
          <div className="section-heading-row"><div className="stack"><Eyebrow>Free video guidance</Eyebrow><h2>Two ways into the IA.</h2></div><p className="lede">Follow the complete guide when you want the whole process, or use the ideas playlist to explore how mathematics can become an investigation.</p></div>
          <div className="ia-video-grid">
            <article className="ia-video-card"><VideoEmbed title="IB Math IA complete guide playlist" playlistId="PLcvv9pSnukaVkFh_OkFceh0aD9Ov02UjV" /><div className="stack"><span className="badge">Complete guide</span><h3>From introduction to final exploration</h3><p>Work through the IA in a clear sequence and understand the role of each stage.</p><ButtonLink href="/go/ia-complete-guide" secondary>Open the playlist on YouTube</ButtonLink></div></article>
            <article className="ia-video-card"><VideoEmbed title="IB Math IA ideas playlist" playlistId="PLcvv9pSnukaVyAMiGPRxJsh6L2wydKFPm" /><div className="stack"><span className="badge">Ideas and modelling</span><h3>See possible explorations take shape</h3><p>Use worked ideas to understand the difference between a broad topic and a focused mathematical investigation.</p><ButtonLink href="/go/ia-ideas" secondary>Open the playlist on YouTube</ButtonLink></div></article>
          </div>
        </Container>
      </section>

      <section className="ia-book-cta"><Container className="ia-book-cta-grid"><div><Image src="/images/ib-mathematics-ia-book-cover.jpg" alt="Cover of IB Mathematics IA: The Complete Guide to the Internal Assessment" width={240} height={339} /></div><div className="stack-lg"><Eyebrow>Go deeper</Eyebrow><h2>Keep the complete IA process on your desk.</h2><p className="lede">The 320-page book brings Mr Flynn IB&apos;s guidance into one structured reference, with clear strategies, examiner-informed insight and mathematical examples.</p><div className="cluster"><ButtonLink href="/book">Learn about the book</ButtonLink><ButtonLink href="/go/amazon-book" secondary>View on Amazon</ButtonLink></div></div></Container></section>
    </>
  );
}
