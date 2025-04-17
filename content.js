/**
 * Instagram Story Assistant
 * Content script that handles Instagram interaction
 */

class InstagramStoryAssistant {
  constructor() {
    this.isInitialized = false;
    this.lists = [];
    this.currentUsername = '';
    this.lastPathname = '';
    
    this.init();
  }

  async init() {
    if (this.isInitialized) return;
    
    // Load stored data
    await this.loadStoredData();
    
    // Add navigation listener to handle Instagram SPA
    this.setupNavigationObserver();
    
    // Check current page
    this.checkCurrentPage();
    
    // Set up message listener for communication with popup and background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'refreshLists') {
        this.loadStoredData()
          .then(() => this.checkCurrentPage())
          .then(() => sendResponse({ success: true }));
        return true;
      }
    });
    
    this.isInitialized = true;
    console.log('Instagram Story Assistant initialized');
  }

  async loadStoredData() {
    return new Promise((resolve) => {
      chrome.storage.local.get('targetLists', (data) => {
        this.lists = data.targetLists || [];
        resolve();
      });
    });
  }
  
  setupNavigationObserver() {
    // We need to detect URL changes for Instagram's SPA
    this.lastPathname = window.location.pathname;
    
    // Check periodically for URL changes
    setInterval(() => {
      if (window.location.pathname !== this.lastPathname) {
        this.lastPathname = window.location.pathname;
        setTimeout(() => this.checkCurrentPage(), 1000); // Wait for content to load
      }
    }, 500);
    
    // Also observe DOM changes for profile loading
    const observer = new MutationObserver((mutations) => {
      // Check if profile header has loaded or changed
      const hasProfileHeader = document.querySelector('header section h2');
      if (hasProfileHeader) {
        this.checkCurrentPage();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  checkCurrentPage() {
    // Check if we're on a profile page
    const profileRegex = /^\/([^\/]+)\/?$/;
    const match = window.location.pathname.match(profileRegex);
    
    if (match) {
      const username = match[1];
      
      // Skip non-profile pages
      if (username === 'explore' || username === 'direct' || username === '') return;
      
      // Check if this is a profile page by looking for typical profile elements
      if (this.isProfilePage()) {
        this.currentUsername = username;
        this.injectAddToListButton(username);
      }
    }
  }
  
  isProfilePage() {
    // Check for elements that indicate a profile page
    const hasProfileHeader = document.querySelector('header section h2');
    const hasProfileImage = document.querySelector('header img');
    
    // Look for typical profile stats (followers, following)
    const hasProfileStats = document.querySelector('header section ul');
    
    return hasProfileHeader && hasProfileImage && hasProfileStats;
  }
  
  injectAddToListButton(username) {
    // Check if button already exists
    if (document.querySelector('.isa-btn')) return;
    
    // Get profile info
    const profileName = this.getProfileName();
    const followers = this.getFollowerCount();
    
    // Create button with minimal modern design and text
    const button = document.createElement('button');
    button.className = 'isa-btn';
    button.innerHTML = `
      <svg viewBox="0 0 24 24" class="isa-btn-icon" aria-hidden="true">
        <path fill="none" d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <span class="isa-btn-text">Add to List</span>
    `;
    
    // Add title for accessibility and tooltip
    button.title = "Add to List";
    
    // Add click event
    button.addEventListener('click', () => {
      this.showAddToListModal(username, profileName, followers);
    });
    
    // Find best place to insert the button
    this.insertButtonIntoHeader(button);
  }

  insertButtonIntoHeader(button) {
    // Try to find the options button container at the end of the header
    const optionsButton = document.querySelector('.x1i10hfl[role="button"] svg[aria-label="Options"]');
    if (optionsButton) {
      // Find the parent container that has role="button"
      let parent = optionsButton.closest('[role="button"]');
      if (parent) {
        // Go up one more level to the container
        parent = parent.parentElement;
        if (parent && parent.parentElement) {
          // Insert before the options button container
          parent.parentElement.insertBefore(button, parent);
          return true;
        }
      }
    }
    
    // Alternative: Look for the options dots icon
    const dotsIcon = document.querySelector('svg[aria-label="Options"]');
    if (dotsIcon) {
      // Navigate up to find appropriate container
      const container = dotsIcon.closest('div[class*="x1q0g3np"]');
      if (container && container.parentElement) {
        container.parentElement.insertBefore(button, container);
        return true;
      }
    }
    
    // Try to find the profile actions row with buttons
    const messageButton = document.querySelector('div[role="button"]:not(.isa-btn):contains("Message")');
    if (messageButton) {
      const parent = messageButton.parentElement;
      if (parent) {
        // Insert after the Message button
        if (parent.nextSibling) {
          parent.parentNode.insertBefore(button, parent.nextSibling);
        } else {
          parent.parentNode.appendChild(button);
        }
        return true;
      }
    }
    
    // Look for the header actions container
    const headerActions = document.querySelector('header div.x9f619.xjbqb8w.x78zum5');
    if (headerActions) {
      // Find the container that has the Follow/Message buttons
      const actionButtons = headerActions.querySelectorAll('div[class*="x9f619"][class*="xjbqb8w"][class*="x78zum5"]');
      if (actionButtons.length > 0) {
        // Insert into the last action buttons container before options
        const lastButtonContainer = actionButtons[actionButtons.length - 1];
        lastButtonContainer.appendChild(button);
        return true;
      } else {
        // Just add to the header actions
        headerActions.appendChild(button);
        return true;
      }
    }
  
    // Try a direct selector for the action buttons row
    const actionRow = document.querySelector('div.x9f619.xjbqb8w.x78zum5.x168nmei.x13lgxp2.x5pf9jr.xo71vjh.x1n2onr6.x1plvlek.xryxfnj.x1iyjqo2.x2lwn1j.xeuugli.xdt5ytf.xqjyukv.x1qjc9v5.x1oa3qoh.x1nhvcw1');
    if (actionRow) {
      // Create a container similar to other buttons for proper alignment
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'x9f619 xjbqb8w x78zum5 x168nmei x13lgxp2 x5pf9jr xo71vjh x1n2onr6 x6ikm8r x10wlt62 x1iyjqo2 x2lwn1j xeuugli xdt5ytf xqjyukv x1qjc9v5 x1oa3qoh x1nhvcw1';
      buttonContainer.style.width = '32px';
      buttonContainer.appendChild(button);
      
      // Insert before the last child (options)
      actionRow.insertBefore(buttonContainer, actionRow.lastElementChild);
      return true;
    }
    
    return false;
  }

  getProfileName() {
    const nameElement = document.querySelector('header section h2');
    return nameElement ? nameElement.textContent.trim() : this.currentUsername;
  }
  
  getFollowerCount() {
    // Try to find followers count
    const statsItems = document.querySelectorAll('header section ul li');
    let followers = 'Unknown';
    
    // Look for the li with anchor that contains "followers"
    for (const item of statsItems) {
      const text = item.textContent.toLowerCase();
      if (text.includes('follower')) {
        const countElement = item.querySelector('span span');
        followers = countElement ? countElement.textContent.trim() : 'Unknown';
        break;
      }
    }
    
    return followers;
  }
  
  insertButtonIntoPage(button) {
    // Find the profile actions area (where follow button is)
    const header = document.querySelector('header');
    if (!header) return;
    
    // Look for the section containing the follow/message button
    const actionSection = header.querySelector('section div:nth-child(2)');
    if (actionSection) {
      // Check if it has flex display
      const style = window.getComputedStyle(actionSection);
      if (style.display === 'flex') {
        // Make sure our button aligns well
        button.style.alignSelf = 'center';
        button.style.marginLeft = '8px';
      }
      
      actionSection.appendChild(button);
    } else {
      // Try to find a better location
      const buttonContainer = header.querySelector('section > div');
      if (buttonContainer) {
        buttonContainer.appendChild(button);
      } else {
        // Fallback: Add button to the end of the header
        header.appendChild(button);
      }
    }
  }
  
  showAddToListModal(username, profileName, followers) {
    // Make sure profile name exists
    profileName = profileName || username;
    
    // Create modal element
    const modal = document.createElement('div');
    modal.className = 'isa-modal';
    
    // Build modal content
    let modalHtml = `
      <div class="isa-modal-content">
        <div class="isa-modal-header">
          <h3>Add to List</h3>
          <button class="isa-modal-close">&times;</button>
        </div>
        <div class="isa-modal-body">
    `;
    
    // Show existing lists or option to create new list
    if (this.lists && this.lists.length > 0) {
      modalHtml += `
        <div class="isa-form-group">
          <label for="isa-list-select">Select a list</label>
          <select id="isa-list-select">
            <option value="">-- Select a list --</option>
            ${this.lists.map(list => `<option value="${list.id}">${list.name}</option>`).join('')}
          </select>
        </div>
        
        <div class="isa-checkbox">
          <input type="checkbox" id="isa-create-new" />
          <span class="isa-checkbox-custom"></span>
          <label for="isa-create-new">Create new list</label>
        </div>
        
        <div id="isa-new-list-input" class="isa-form-group isa-slide-down">
          <label for="isa-list-name">List name</label>
          <input type="text" id="isa-list-name" placeholder="E.g. Developers, Entrepreneurs">
        </div>
      `;
    } else {
      modalHtml += `
        <div class="isa-form-group">
          <label for="isa-list-name">Create new list</label>
          <input type="text" id="isa-list-name" placeholder="E.g. Developers, Entrepreneurs">
        </div>
      `;
    }
    
    modalHtml += `
        </div>
        <div class="isa-modal-footer">
          <button class="isa-btn-secondary" id="isa-cancel-btn">Cancel</button>
          <button class="isa-btn-primary" id="isa-add-btn">Add Profile</button>
        </div>
      </div>
    `;
    
    modal.innerHTML = modalHtml;
    document.body.appendChild(modal);
    
    // Setup event listeners
    modal.querySelector('.isa-modal-close').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.querySelector('#isa-cancel-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    // Handle checkbox for create new list
    const createNewCheckbox = modal.querySelector('#isa-create-new');
    if (createNewCheckbox) {
      createNewCheckbox.addEventListener('change', (e) => {
        const newListInput = modal.querySelector('#isa-new-list-input');
        const listSelect = modal.querySelector('#isa-list-select');
        
        if (e.target.checked) {
          newListInput.classList.add('open');
          listSelect.disabled = true;
          
          // Focus the input field after animation
          setTimeout(() => {
            modal.querySelector('#isa-list-name').focus();
          }, 300);
        } else {
          newListInput.classList.remove('open');
          listSelect.disabled = false;
        }
      });
      
      // Also make the entire checkbox label area clickable
      const checkboxLabel = modal.querySelector('.isa-checkbox');
      checkboxLabel.addEventListener('click', (e) => {
        // Only toggle if the actual checkbox or its custom visual weren't clicked
        // (as those already trigger the change event)
        if (e.target !== createNewCheckbox && !e.target.classList.contains('isa-checkbox-custom')) {
          createNewCheckbox.checked = !createNewCheckbox.checked;
          
          // Manually trigger change event
          createNewCheckbox.dispatchEvent(new Event('change'));
        }
      });
    }
    
    // Handle add button click
    modal.querySelector('#isa-add-btn').addEventListener('click', async () => {
      const isCreateNew = createNewCheckbox && createNewCheckbox.checked;
      const listNameInput = modal.querySelector('#isa-list-name');
      const listSelect = modal.querySelector('#isa-list-select');
      
      let selectedListId = '';
      let error = null;
      
      if (isCreateNew || !this.lists.length) {
        // Creating a new list
        const newListName = listNameInput.value.trim();
        if (!newListName) {
          error = 'Please enter a list name';
        } else {
          // Create new list
          selectedListId = await this.createNewList(newListName);
        }
      } else {
        // Using existing list
        selectedListId = listSelect.value;
        if (!selectedListId) {
          error = 'Please select a list';
        }
      }
      
      if (error) {
        // Show error
        let errorDiv = modal.querySelector('.isa-error');
        if (!errorDiv) {
          errorDiv = document.createElement('div');
          errorDiv.className = 'isa-error';
          modal.querySelector('.isa-modal-body').appendChild(errorDiv);
        }
        errorDiv.textContent = error;
        return;
      }
      
      // Add profile to the selected list
      this.addProfileToList(selectedListId, username, profileName, followers);
      
      // Close modal
      document.body.removeChild(modal);
    });
    
    // Close when clicking outside of modal
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
  
  async createNewList(name) {
    return new Promise((resolve) => {
      chrome.storage.local.get('targetLists', (data) => {
        const lists = data.targetLists || [];
        
        // Create new list with unique ID
        const newList = {
          id: Date.now().toString(),
          name: name,
          dateCreated: new Date().toISOString(),
          profiles: []
        };
        
        lists.push(newList);
        this.lists = lists;
        
        chrome.storage.local.set({ targetLists: lists }, () => {
          resolve(newList.id);
        });
      });
    });
  }
  
  addProfileToList(listId, username, profileName, followers) {
    chrome.storage.local.get('targetLists', (data) => {
      const lists = data.targetLists || [];
      const listIndex = lists.findIndex(list => list.id === listId);
      
      if (listIndex !== -1) {
        // Check if profile already exists in list
        const profileExists = lists[listIndex].profiles.some(profile => profile.username === username);
        
        if (!profileExists) {
          // Add profile to list
          lists[listIndex].profiles.push({
            username,
            profileName,
            followers,
            addedAt: new Date().toISOString()
          });
          
          // Save updated lists
          chrome.storage.local.set({ targetLists: lists }, () => {
            this.lists = lists;
            this.showToast(`Added @${username} to list: ${lists[listIndex].name}`);
            
            // Log activity
            this.logActivity(`Added profile @${username} to list: ${lists[listIndex].name}`);
          });
        } else {
          this.showToast(`@${username} is already in list: ${lists[listIndex].name}`);
        }
      }
    });
  }
  
  showToast(message) {
    // Remove existing toast if any
    const existingToast = document.querySelector('.isa-toast');
    if (existingToast) {
      existingToast.remove();
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = 'isa-toast';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (document.body.contains(toast)) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 300);
      }
    }, 3000);
  }
  
  logActivity(message) {
    const log = {
      timestamp: new Date().toISOString(),
      type: 'user-action',
      message,
      url: window.location.href
    };
    
    // Send log to background script
    chrome.runtime.sendMessage({
      action: 'logActivity',
      data: log
    });
  }
}

// Helper method to find elements containing text (used for Message button)
Element.prototype.contains = function(text) {
  return this.innerText && this.innerText.includes(text);
};

// Initialize the assistant when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new InstagramStoryAssistant());
} else {
  new InstagramStoryAssistant();
}
