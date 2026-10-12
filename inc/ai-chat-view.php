<?php if (!defined('C122')) { http_response_code(404); exit; } ?>
<section class="view" id="view-ai-chat" role="tabpanel" aria-labelledby="tab-ai-chat" hidden>
  <div class="ai-chat-hero">
    <div><span class="eyebrow">12–2 · A LITTLE HELP, EVERY DAY</span><h2>AI CHAT<span class="ai-hero-mark" aria-hidden="true">↗</span></h2><p>Бодлоо цэгцэл. Асуултаа асуу. Яриагаа үргэлжлүүл.</p></div>
    <span class="ai-model-badge">IwnlX AI <span>egune-nano</span></span>
  </div>
  <div class="ai-chat-account glass">
    <div class="ai-student-field"><label for="aiChatStudent">Чиний нэр</label><select id="aiChatStudent" class="input"><option value="">Нэрээ сонгоорой</option></select></div>
    <span id="aiChatAccountStatus">Нэрээ сонгоод хавтасны кодоороо нэвтрээрэй. Яриа зөвхөн чамд харагдана.</span>
    <button class="btn btn-ghost btn-sm" id="aiChatUnlock" type="button"><?= icon('lock','i-sm') ?>Кодоор нээх</button>
    <button class="btn btn-ghost btn-sm" id="aiChatLock" type="button" hidden><?= icon('lock','i-sm') ?>Түгжих</button>
  </div>
  <p class="ai-chat-status" id="aiChatStatus" role="status" aria-live="polite"></p>
  <div class="ai-chat-workspace glass">
    <aside class="ai-chat-sidebar" aria-label="Хадгалсан ярианууд">
      <div class="ai-chat-sidebar-head"><h3>Миний ярианууд</h3><button class="btn btn-primary btn-sm" id="aiChatNew" type="button" disabled><?= icon('plus','i-sm') ?>Шинэ</button></div>
      <div class="ai-chat-list" id="aiChatList"><p class="ai-chat-side-empty">Яриагаа хадгалахын тулд нэвтрээрэй.</p></div>
      <div class="ai-chat-sidebar-foot"><button class="btn btn-ghost btn-sm" id="aiChatTrash" type="button" disabled><?= icon('trash','i-sm') ?>Устгасан</button><button class="btn btn-ghost btn-sm" id="aiChatRefresh" type="button" disabled aria-label="Яриануудыг шинэчлэх"><?= icon('refresh','i-sm') ?></button></div>
      <p class="ai-chat-privacy-note">Хавтасны кодоо мэддэг хүн энэ нэрийн яриаг нээж чадна. Кодоо бусдад бүү дамжуулаарай.</p>
    </aside>
    <div class="ai-chat-main">
      <div class="ai-chat-topbar"><div><span class="ai-chat-small-label">IWNLX AI</span><h3 id="aiChatTitle">Чиний дараагийн санаа эндээс.</h3></div><div class="ai-chat-tools"><button class="btn btn-ghost btn-sm" id="aiChatRename" type="button" hidden>Нэр солих</button><button class="btn btn-ghost btn-sm" id="aiChatDelete" type="button" hidden aria-label="Энэ яриаг устгах"><?= icon('trash','i-sm') ?></button></div></div>
      <div class="ai-chat-messages" id="aiChatMessages" role="log" aria-label="AI яриа" aria-live="polite" aria-relevant="additions text">
        <div class="ai-chat-welcome"><div class="ai-welcome-symbol" aria-hidden="true">ix</div><h3>Сайн уу. Юу ярилцах вэ?</h3><p>Хичээлийн бодлого, шинэ санаа, эсвэл зүгээр л өнөөдрийн тухай.</p><div class="ai-chat-prompts"><button type="button" data-ai-prompt="Надад математикийн ойлголтыг энгийн жишээгээр тайлбарлаач.">Хичээлээ ойлгох <span>↗</span></button><button type="button" data-ai-prompt="Өнөөдрийн хичээл, амралтаа тэнцвэржүүлэх төлөвлөгөө гаргахад туслаач.">Өдрөө төлөвлөх <span>↗</span></button><button type="button" data-ai-prompt="Let's practise conversational English. Ask me a simple question and help me improve my answer.">English practice <span>↗</span></button></div></div>
      </div>
      <div class="ai-chat-busy" id="aiChatBusy" hidden role="status"><span class="ai-busy-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>IwnlX AI хариулж байна…</span></div>
      <form class="ai-chat-composer" id="aiChatForm">
        <label for="aiChatMessage" class="ai-sr-only">AI-д зурвас бичих</label><textarea class="input" id="aiChatMessage" rows="2" maxlength="4000" placeholder="Асуулт эсвэл бодлоо бичээрэй…" aria-describedby="aiChatComposerHint"></textarea>
        <p class="ai-chat-composer-hint" id="aiChatComposerHint" role="status">Зурвасаа бичээд, илгээхийн өмнө нэрээ сонгоорой.</p>
        <div class="ai-chat-composer-bottom"><label class="ai-chat-long"><input id="aiChatLongReply" type="checkbox">Дэлгэрэнгүй хариулт</label><span id="aiChatCharCount">0 / 4000</span><button class="btn btn-primary" id="aiChatSend" type="submit" disabled>Илгээх <span aria-hidden="true">↑</span></button></div>
      </form>
      <div class="ai-chat-footnote"><p>Яриа сайт дээр хадгалагдана. Токен хэмнэхийн тулд сүүлийн 8,000 тэмдэгт хүртэлх яриаг AI-д илгээнэ.</p><span id="aiChatUsage">Enter · илгээх / Shift + Enter · шинэ мөр</span></div>
    </div>
  </div>
  <p class="ai-chat-bottom-note">IwnlX AI · Egune API-аар ажиллана. AI алдаа гаргаж болно — чухал хариултыг нягтлаарай. Хүсэлт зөвхөн “Илгээх” дарахад үүснэ. <a href="ai-privacy.php" target="_blank" rel="noopener">Яриа, мэдээлэл ба хэрэглээ</a></p>
</section>
