import { invoke, router } from "@forge/bridge";

const app = document.querySelector("#app");
const reference = new URLSearchParams(window.location.search).get("invitation");

function render(html) {
  app.innerHTML = html;
}

function responseBody(response) {
  return "body" in response ? response.body : response;
}

function renderMessage(title, paragraphs) {
  const heading = document.createElement("h1");
  heading.textContent = title;
  app.replaceChildren(
    heading,
    ...paragraphs.map((text) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      return paragraph;
    }),
  );
}

async function renderRecipientInvitation() {
  const response = responseBody(await invoke("readInvitation", { reference }));

  if (response.status !== "available") {
    renderMessage("Invitation unavailable", [
      "This invitation is unavailable or you are not its recipient.",
    ]);
    return;
  }

  const { invitation } = response;
  renderMessage("Peer invitation", [
    invitation.purpose,
    `Terms: ${invitation.termsVersion}`,
    `Expires: ${invitation.expiresAt}`,
    ...(invitation.safeLabel ? [invitation.safeLabel] : []),
  ]);
}

async function createInvitation(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const greenNavigationUrl = await router.getUrl({
    moduleKey: "scg-peer-invitations",
    target: "module",
  });

  if (!greenNavigationUrl) {
    renderMessage("Invitation unavailable", [
      "The invitation URL could not be created.",
    ]);
    return;
  }

  const response = responseBody(
    await invoke("createInvitation", {
      greenNavigationUrl: greenNavigationUrl.toString(),
      purpose: form.get("purpose"),
      recipientAccountId: form.get("recipientAccountId"),
      safeLabel: form.get("safeLabel") || undefined,
    }),
  );

  if (response.status !== "created") {
    renderMessage("Invitation unavailable", [
      "Check the required fields and try again.",
    ]);
    return;
  }

  renderMessage("Invitation created", [
    "Send this URL through an existing business channel:",
    response.navigationUrl,
  ]);
}

function renderInvitationForm() {
  render(`
    <h1>Invite peer administrator</h1>
    <p>Creates a recipient-bound invitation with a seven-day setup deadline.</p>
    <form id="invitation-form">
      <label>Recipient Green account ID <input name="recipientAccountId" required></label>
      <label>Purpose <textarea name="purpose" required></textarea></label>
      <label>Safe label (optional) <input name="safeLabel"></label>
      <button type="submit">Create invitation</button>
    </form>
  `);
  document
    .querySelector("#invitation-form")
    .addEventListener("submit", createInvitation);
}

if (reference) {
  void renderRecipientInvitation();
} else {
  renderInvitationForm();
}
