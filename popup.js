/**
 * Instagram Story Assistant
 * Popup script for user interaction
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize the popup
  initPopup();
  
  // Load data
  loadData();
  
  // Set up event listeners
  setupEventListeners();
});

function initPopup() {
  // Setup tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      
      // Update active tab button
      tabBtns.forEach(btn => btn.classList.remove('active'));
      btn.classList.add('active');
      
      // Show active tab content
      tabContents.forEach(content => {
        if (content.id === `tab-${tabId}`) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });
    });
  });
  
  // Setup settings inputs
  const viewDelayInput = document.getElementById('view-delay');
  const viewDelayValue = document.getElementById('view-delay-value');
  
  viewDelayInput.addEventListener('input', () => {
    viewDelayValue.textContent = `${viewDelayInput.value}s`;
  });
  
  const likeProbabilityInput = document.getElementById('like-probability');
  const likeProbabilityValue = document.getElementById('like-probability-value');
  
  likeProbabilityInput.addEventListener('input', () => {
    likeProbabilityValue.textContent = `${likeProbabilityInput.value}%`;
  });
}

function loadData() {
  // Get lists and populate UI
  chrome.storage.local.get(['targetLists', 'activityLogs', 'settings', 'automationStatus'], (data) => {
    const lists = data.targetLists || [];
    populateListsUI(lists);
    
    const logs = data.activityLogs || [];
    populateActivityLogs(logs);
    
    // Load settings
    loadSettings(data.settings);
    
    // Update automation status
    updateAutomationStatus(data.automationStatus);
    
    // Update stats
    updateStatistics();
  });
}

function populateListsUI(lists) {
  const emptyLists = document.getElementById('empty-lists');
  const listContent = document.getElementById('list-content');
  const listSelect = document.getElementById('list-select');
  const automationListSelect = document.getElementById('automation-list');
  
  // Clear previous options (except first option)
  while (listSelect.options.length > 1) {
    listSelect.remove(1);
  }
  
  while (automationListSelect.options.length > 1) {
    automationListSelect.remove(1);
  }
  
  if (lists.length === 0) {
    // Show empty state
    emptyLists.classList.remove('hidden');
    listContent.classList.add('hidden');
    return;
  }
  
  // Show content and hide empty state
  emptyLists.classList.add('hidden');
  listContent.classList.remove('hidden');
  
  // Add options for each list
  lists.forEach(list => {
    const option = document.createElement('option');
    option.value = list.id;
    option.textContent = `${list.name} (${list.profiles ? list.profiles.length : 0})`;
    listSelect.appendChild(option);
    
    // Also add to automation select
    const automationOption = document.createElement('option');
    automationOption.value = list.id;
    automationOption.textContent = `${list.name} (${list.profiles ? list.profiles.length : 0})`;
    automationListSelect.appendChild(automationOption);
  });
  
  // Set up list selection change event
  listSelect.addEventListener('change', () => {
    const selectedListId = listSelect.value;
    if (!selectedListId) {
      showEmptyProfiles();
      document.getElementById('rename-list').disabled = true;
      document.getElementById('delete-list').disabled = true;
      return;
    }
    
    document.getElementById('rename-list').disabled = false;
    document.getElementById('delete-list').disabled = false;
    
    const selectedList = lists.find(list => list.id === selectedListId);
    if (selectedList) {
      showProfiles(selectedList);
    }
  });
}

function showEmptyProfiles() {
  const emptyProfiles = document.getElementById('empty-profiles');
  const profileList = document.getElementById('profile-list');
  
  emptyProfiles.classList.remove('hidden');
  profileList.classList.add('hidden');
}

function showProfiles(list) {
  const emptyProfiles = document.getElementById('empty-profiles');
  const profileList = document.getElementById('profile-list');
  
  if (!list.profiles || list.profiles.length === 0) {
    showEmptyProfiles();
    return;
  }
  
  // Show profile list and hide empty state
  emptyProfiles.classList.add('hidden');
  profileList.classList.remove('hidden');
  
  // Clear previous profiles
  profileList.innerHTML = '';
  
  // Add each profile
  list.profiles.forEach(profile => {
    const profileItem = document.createElement('li');
    profileItem.className = 'profile-item';
    
    const addedDate = new Date(profile.addedAt).toLocaleDateString();
    
    profileItem.innerHTML = `
      <div class="profile-info">
        <div class="profile-avatar">
          ${profile.profileName ? profile.profileName.charAt(0).toUpperCase() : '@'}
        </div>
        <div class="profile-details">
          <h4>${profile.profileName || profile.username}</h4>
          <p>@${profile.username} · ${profile.followers} · Added ${addedDate}</p>
        </div>
      </div>
      <div class="profile-actions">
        <button class="btn-remove" data-username="${profile.username}">
          <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      </div>
    `;
    
    profileList.appendChild(profileItem);
    
    // Add event listener to remove button
    profileItem.querySelector('.btn-remove').addEventListener('click', function() {
      removeProfileFromList(list.id, this.getAttribute('data-username'));
    });
  });
}

function removeProfileFromList(listId, username) {
  chrome.storage.local.get('targetLists', (data) => {
    const lists = data.targetLists || [];
    const listIndex = lists.findIndex(list => list.id === listId);
    
    if (listIndex === -1) return;
    
    // Find and remove profile
    const profiles = lists[listIndex].profiles;
    const profileIndex = profiles.findIndex(p => p.username === username);
    
    if (profileIndex === -1) return;
    
    profiles.splice(profileIndex, 1);
    
    // Update storage
    chrome.storage.local.set({ targetLists: lists }, () => {
      // Update UI
      showProfiles(lists[listIndex]);
      
      // Update select options
      const listSelect = document.getElementById('list-select');
      const option = listSelect.options[listSelect.selectedIndex];
      option.textContent = `${lists[listIndex].name} (${profiles.length})`;
      
      // Update automation select options
      const automationSelect = document.getElementById('automation-list');
      for (let i = 0; i < automationSelect.options.length; i++) {
        if (automationSelect.options[i].value === listId) {
          automationSelect.options[i].textContent = `${lists[listIndex].name} (${profiles.length})`;
          break;
        }
      }
      
      // Update status
      document.getElementById('status-message').textContent = `Profile removed from list`;
      
      // Update statistics
      updateStatistics();
    });
  });
}

function populateActivityLogs(logs) {
  const emptyLogs = document.getElementById('empty-logs');
  const activityLogs = document.getElementById('activity-logs');
  
  if (!logs || logs.length === 0) {
    emptyLogs.classList.remove('hidden');
    activityLogs.classList.add('hidden');
    return;
  }
  
  // Show logs and hide empty state
  emptyLogs.classList.add('hidden');
  activityLogs.classList.remove('hidden');
  
  // Clear previous logs
  activityLogs.innerHTML = '';
  
  // Add recent logs (max 20)
  const recentLogs = logs.slice(0, 20);
  
  recentLogs.forEach(log => {
    const logItem = document.createElement('li');
    logItem.className = 'log-item';
    
    const logDate = new Date(log.timestamp);
    const formattedDate = `${logDate.toLocaleDateString()} ${logDate.toLocaleTimeString()}`;
    
    logItem.innerHTML = `
      <div class="log-time">${formattedDate}</div>
      ${log.message}
    `;
    
    activityLogs.appendChild(logItem);
  });
}

function loadSettings(settings) {
  if (!settings) return;
  
  // Update settings UI
  document.getElementById('view-delay').value = settings.viewDelay ? Math.floor(settings.viewDelay / 1000) : 3;
  document.getElementById('view-delay-value').textContent = `${document.getElementById('view-delay').value}s`;
  
  document.getElementById('like-probability').value = settings.likeProbability || 80;
  document.getElementById('like-probability-value').textContent = `${document.getElementById('like-probability').value}%`;
  
  document.getElementById('human-delay').checked = settings.humanDelay !== false;
}

function updateAutomationStatus(status) {
  const statusBadge = document.getElementById('status-badge');
  const startBtn = document.getElementById('start-automation');
  const stopBtn = document.getElementById('stop-automation');
  
  if (status && status.active) {
    statusBadge.textContent = 'Active';
    statusBadge.classList.add('active');
    startBtn.disabled = true;
    stopBtn.disabled = false;
  } else {
    statusBadge.textContent = 'Inactive';
    statusBadge.classList.remove('active');
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

function updateStatistics() {
  // Get statistics from storage
  chrome.storage.local.get(['activityLogs', 'targetLists'], (data) => {
    const logs = data.activityLogs || [];
    const lists = data.targetLists || [];
    
    // Count total profiles across all lists
    let totalProfiles = 0;
    lists.forEach(list => {
      totalProfiles += list.profiles ? list.profiles.length : 0;
    });
    
    // Count viewed and liked stories
    const viewedStories = logs.filter(log => log.type === 'story-view').length;
    const likedStories = logs.filter(log => log.type === 'story-like').length;
    
    // Update UI
    document.getElementById('stories-viewed').textContent = viewedStories;
    document.getElementById('stories-liked').textContent = likedStories;
    document.getElementById('profiles-count').textContent = totalProfiles;
    
    // TODO: Update chart if needed
  });
}

function setupEventListeners() {
  // Create list button
  document.getElementById('create-list').addEventListener('click', showCreateListModal);
  document.getElementById('create-first-list').addEventListener('click', showCreateListModal);
  
  // Create list modal handlers
  document.getElementById('cancel-create').addEventListener('click', hideModals);
  document.getElementById('confirm-create').addEventListener('click', createNewList);
  
  // Modal close button
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', hideModals);
  });
  
  // List actions
  document.getElementById('rename-list').addEventListener('click', showRenameListModal);
  document.getElementById('delete-list').addEventListener('click', confirmDeleteList);
  
  // Automation controls
  document.getElementById('start-automation').addEventListener('click', startAutomation);
  document.getElementById('stop-automation').addEventListener('click', stopAutomation);
  
  // Save settings on change
  const settingsInputs = [
    document.getElementById('view-delay'),
    document.getElementById('like-probability'),
    document.getElementById('human-delay')
  ];
  
  settingsInputs.forEach(input => {
    input.addEventListener('change', saveSettings);
  });
  
  // Date filter buttons for stats
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      const period = e.target.getAttribute('data-period');
      filterStatsByPeriod(period);
    });
  });
}

function showCreateListModal() {
  const modal = document.getElementById('create-list-modal');
  modal.style.display = 'flex';
  
  // Focus input field
  setTimeout(() => {
    document.getElementById('new-list-name').focus();
  }, 100);
}

function hideModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
}

function createNewList() {
  const listNameInput = document.getElementById('new-list-name');
  const listName = listNameInput.value.trim();
  
  if (!listName) {
    // Show error
    listNameInput.style.borderColor = 'var(--danger-color)';
    return;
  }
  
  chrome.storage.local.get('targetLists', (data) => {
    const lists = data.targetLists || [];
    
    // Create new list with unique ID
    const newList = {
      id: Date.now().toString(),
      name: listName,
      dateCreated: new Date().toISOString(),
      profiles: []
    };
    
    lists.push(newList);
    
    chrome.storage.local.set({ targetLists: lists }, () => {
      // Reset form
      listNameInput.value = '';
      
      // Hide modal
      hideModals();
      
      // Update UI
      populateListsUI(lists);
      
      // Show success message
      document.getElementById('status-message').textContent = `List "${listName}" created`;
      
      // Notify content scripts
      chrome.tabs.query({ url: "*://*.instagram.com/*" }, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { action: 'refreshLists' });
        });
      });
    });
  });
}

function showRenameListModal() {
  const listSelect = document.getElementById('list-select');
  const selectedListId = listSelect.value;
  
  if (!selectedListId) return;
  
  chrome.storage.local.get('targetLists', (data) => {
    const lists = data.targetLists || [];
    const selectedList = lists.find(list => list.id === selectedListId);
    
    if (!selectedList) return;
    
    // Create modal element
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Rename List</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="rename-list-name">List Name</label>
            <input type="text" id="rename-list-name" value="${selectedList.name}">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="cancel-rename">Cancel</button>
          <button class="btn-primary" id="confirm-rename">Save</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setup event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.querySelector('#cancel-rename').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.querySelector('#confirm-rename').addEventListener('click', () => {
      const newName = modal.querySelector('#rename-list-name').value.trim();
      
      if (!newName) {
        modal.querySelector('#rename-list-name').style.borderColor = 'var(--danger-color)';
        return;
      }
      
      renameList(selectedListId, newName);
      document.body.removeChild(modal);
    });
    
    // Focus input field
    setTimeout(() => {
      modal.querySelector('#rename-list-name').focus();
      modal.querySelector('#rename-list-name').select();
    }, 100);
  });
}

function renameList(listId, newName) {
  chrome.storage.local.get('targetLists', (data) => {
    const lists = data.targetLists || [];
    const listIndex = lists.findIndex(list => list.id === listId);
    
    if (listIndex === -1) return;
    
    lists[listIndex].name = newName;
    
    chrome.storage.local.set({ targetLists: lists }, () => {
      // Update UI
      populateListsUI(lists);
      
      // Select the renamed list
      document.getElementById('list-select').value = listId;
      
      // Show success message
      document.getElementById('status-message').textContent = `List renamed to "${newName}"`;
      
      // Notify content scripts
      chrome.tabs.query({ url: "*://*.instagram.com/*" }, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { action: 'refreshLists' });
        });
      });
    });
  });
}

function confirmDeleteList() {
  const listSelect = document.getElementById('list-select');
  const selectedListId = listSelect.value;
  
  if (!selectedListId) return;
  
  chrome.storage.local.get('targetLists', (data) => {
    const lists = data.targetLists || [];
    const selectedList = lists.find(list => list.id === selectedListId);
    
    if (!selectedList) return;
    
    // Create confirm modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Delete List</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete "${selectedList.name}"?</p>
          <p>This will remove all ${selectedList.profiles ? selectedList.profiles.length : 0} profiles from this list.</p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="cancel-delete">Cancel</button>
          <button class="btn-danger" id="confirm-delete">Delete</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setup styles for danger button
    const dangerBtn = modal.querySelector('.btn-danger');
    dangerBtn.style.backgroundColor = 'var(--danger-color)';
    dangerBtn.style.color = 'white';
    dangerBtn.style.border = 'none';
    dangerBtn.style.borderRadius = 'var(--border-radius)';
    dangerBtn.style.padding = '8px 16px';
    dangerBtn.style.fontSize = '14px';
    dangerBtn.style.cursor = 'pointer';
    dangerBtn.style.fontWeight = '500';
    
    // Setup event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.querySelector('#cancel-delete').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.querySelector('#confirm-delete').addEventListener('click', () => {
      deleteList(selectedListId, selectedList.name);
      document.body.removeChild(modal);
    });
  });
}

function deleteList(listId, listName) {
  chrome.storage.local.get('targetLists', (data) => {
    const lists = data.targetLists || [];
    const listIndex = lists.findIndex(list => list.id === listId);
    
    if (listIndex === -1) return;
    
    lists.splice(listIndex, 1);
    
    chrome.storage.local.set({ targetLists: lists }, () => {
      // Update UI
      populateListsUI(lists);
      
      // Show success message
      document.getElementById('status-message').textContent = `List "${listName}" deleted`;
      
      // Notify content scripts
      chrome.tabs.query({ url: "*://*.instagram.com/*" }, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { action: 'refreshLists' });
        });
      });
      
      // Update statistics
      updateStatistics();
    });
  });
}

function saveSettings() {
  const viewDelay = parseInt(document.getElementById('view-delay').value) * 1000; // Convert to milliseconds
  const likeProbability = parseInt(document.getElementById('like-probability').value);
  const humanDelay = document.getElementById('human-delay').checked;
  
  const settings = {
    viewDelay,
    likeProbability,
    humanDelay,
    maxDailyInteractions: 100 // Default value
  };
  
  chrome.storage.local.set({ settings }, () => {
    document.getElementById('status-message').textContent = 'Settings saved';
  });
}

function startAutomation() {
  const listSelect = document.getElementById('automation-list');
  const selectedListId = listSelect.value;
  
  if (!selectedListId) {
    document.getElementById('status-message').textContent = 'Please select a target list';
    return;
  }
  
  const status = {
    active: true,
    startTime: new Date().toISOString(),
    targetListId: selectedListId
  };
  
  // Save current settings
  saveSettings();
  
  // Save automation status
  chrome.storage.local.set({ automationStatus: status }, () => {
    // Update UI
    updateAutomationStatus(status);
    
    // Send message to background script
    chrome.runtime.sendMessage({
      action: 'startAutomation',
      listId: selectedListId
    });
    
    // Show success message
    document.getElementById('status-message').textContent = 'Automation started';
  });
}

function stopAutomation() {
  const status = {
    active: false
  };
  
  // Save automation status
  chrome.storage.local.set({ automationStatus: status }, () => {
    // Update UI
    updateAutomationStatus(status);
    
    // Send message to background script
    chrome.runtime.sendMessage({
      action: 'stopAutomation'
    });
    
    // Show success message
    document.getElementById('status-message').textContent = 'Automation stopped';
  });
}

function filterStatsByPeriod(period) {
  // Filter statistics by time period
  chrome.storage.local.get('activityLogs', (data) => {
    const logs = data.activityLogs || [];
    const now = new Date();
    let filteredLogs = [];
    
    switch (period) {
      case 'day':
        // Filter logs from today
        filteredLogs = logs.filter(log => {
          const logDate = new Date(log.timestamp);
          return logDate.toDateString() === now.toDateString();
        });
        break;
      case 'week':
        // Filter logs from last 7 days
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        filteredLogs = logs.filter(log => {
          const logDate = new Date(log.timestamp);
          return logDate >= weekAgo;
        });
        break;
      case 'month':
        // Filter logs from last 30 days
        const monthAgo = new Date();
        monthAgo.setDate(now.getDate() - 30);
        filteredLogs = logs.filter(log => {
          const logDate = new Date(log.timestamp);
          return logDate >= monthAgo;
        });
        break;
    }
    
    // Count viewed and liked stories in filtered logs
    const viewedStories = filteredLogs.filter(log => log.type === 'story-view').length;
    const likedStories = filteredLogs.filter(log => log.type === 'story-like').length;
    
    // Update UI
    document.getElementById('stories-viewed').textContent = viewedStories;
    document.getElementById('stories-liked').textContent = likedStories;
    
    // TODO: Update chart with filtered data
  });
}
