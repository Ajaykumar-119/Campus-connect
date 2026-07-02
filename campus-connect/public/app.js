const state = { overview: null };
const sections = { dashboard: 'Dashboard', notices: 'Notices', events: 'Events', clubs: 'Clubs', lostfound: 'Lost & Found' };
const $ = selector => document.querySelector(selector);
const formatDate = value => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
async function api(path, options = {}) {
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}
function renderStats(stats) {
  const labels = [['notices', 'Notices'], ['events', 'Events'], ['clubs', 'Clubs'], ['lostFound', 'Lost & Found']];
  $('#statsGrid').innerHTML = labels.map(([key, label]) => '<article class="stat-card"><strong>' + stats[key] + '</strong><span>' + label + '</span></article>').join('');
}
function noticeCard(notice) {
  return '<article class="list-item"><span class="badge ' + notice.priority.toLowerCase() + '">' + notice.priority + '</span><strong>' + notice.title + '</strong><p>' + notice.message + '</p><div class="meta">' + notice.audience + ' - ' + formatDate(notice.createdAt) + '</div></article>';
}
function eventCard(event) {
  return '<article class="mini-card"><span class="badge">' + formatDate(event.date) + '</span><strong>' + event.title + '</strong><p class="meta">' + event.venue + '</p><p class="meta">Hosted by ' + event.host + ' - ' + event.seats + ' seats</p></article>';
}
function clubCard(club) {
  return '<article class="mini-card"><span class="badge">' + club.category + '</span><strong>' + club.name + '</strong><p class="meta">Lead: ' + club.lead + '</p><p class="meta">' + club.members + ' members - ' + club.meeting + '</p></article>';
}
function lostFoundCard(entry) {
  return '<article class="list-item"><span class="badge">' + entry.status + '</span><strong>' + entry.item + '</strong><p class="meta">Place: ' + entry.place + '</p><p class="meta">Contact: ' + entry.contact + ' - ' + formatDate(entry.createdAt) + '</p></article>';
}
function renderOverview(data) {
  state.overview = data;
  $('#profileName').textContent = data.profile.name;
  $('#profileRole').textContent = data.profile.role;
  $('#profileDept').textContent = data.profile.department;
  $('#noticeCount').textContent = data.notices.length;
  $('#eventCount').textContent = data.events.length;
  renderStats(data.stats);
  $('#dashboardNotices').innerHTML = data.notices.slice(0, 3).map(noticeCard).join('');
  $('#dashboardEvents').innerHTML = data.events.slice(0, 3).map(eventCard).join('');
  $('#noticeList').innerHTML = data.notices.map(noticeCard).join('');
  $('#eventList').innerHTML = data.events.map(eventCard).join('');
  $('#clubList').innerHTML = data.clubs.map(clubCard).join('');
  $('#lostFoundList').innerHTML = data.lostFound.map(lostFoundCard).join('');
}
async function loadOverview() { renderOverview(await api('/api/overview')); }
function collectForm(form) { return Object.fromEntries(new FormData(form).entries()); }
function switchSection(id) {
  document.querySelectorAll('.section').forEach(section => section.classList.toggle('active', section.id === id));
  document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.section === id));
  $('#pageTitle').textContent = sections[id];
}
document.querySelectorAll('.nav-link').forEach(button => button.addEventListener('click', () => switchSection(button.dataset.section)));
$('#openLogin').addEventListener('click', () => {
  const profile = state.overview && state.overview.profile;
  if (profile) { $('#loginForm').name.value = profile.name; $('#loginForm').email.value = profile.email; $('#loginForm').role.value = profile.role; $('#loginForm').department.value = profile.department; }
  $('#loginDialog').showModal();
});
$('#loginForm').addEventListener('submit', async event => { event.preventDefault(); await api('/api/login', { method: 'POST', body: JSON.stringify(collectForm(event.currentTarget)) }); $('#loginDialog').close(); event.currentTarget.reset(); await loadOverview(); showToast('Profile updated'); });
$('#noticeForm').addEventListener('submit', async event => { event.preventDefault(); await api('/api/notices', { method: 'POST', body: JSON.stringify(collectForm(event.currentTarget)) }); event.currentTarget.reset(); await loadOverview(); showToast('Notice published'); });
$('#eventForm').addEventListener('submit', async event => { event.preventDefault(); await api('/api/events', { method: 'POST', body: JSON.stringify(collectForm(event.currentTarget)) }); event.currentTarget.reset(); await loadOverview(); showToast('Event added'); });
$('#lostFoundForm').addEventListener('submit', async event => { event.preventDefault(); await api('/api/lost-found', { method: 'POST', body: JSON.stringify(collectForm(event.currentTarget)) }); event.currentTarget.reset(); await loadOverview(); showToast('Report submitted'); });
loadOverview().catch(error => showToast(error.message));