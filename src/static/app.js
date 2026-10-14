document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function createParticipantRow(activityName, email) {
    const participant = document.createElement("li");

    const participantEmail = document.createElement("span");
    participantEmail.className = "participant-email";
    participantEmail.textContent = email;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-participant";
    removeButton.textContent = "×";
    removeButton.title = `Remove ${email} from ${activityName}`;
    removeButton.setAttribute("aria-label", `Remove ${email} from ${activityName}`);
    removeButton.addEventListener("click", () => {
      removeParticipant(activityName, email, removeButton);
    });

    participant.append(participantEmail, removeButton);
    return participant;
  }

  function updateActivityCard(activityName, email, isRegistered) {
    const activityCard = Array.from(activitiesList.querySelectorAll(".activity-card"))
      .find((card) => card.dataset.activityName === activityName);

    if (!activityCard) return;

    const participantsList = activityCard.querySelector(".participants-list");
    const participantsHeading = activityCard.querySelector(".participants-heading");
    const availability = activityCard.querySelector(".activity-availability span");
    const existingParticipant = Array.from(participantsList.querySelectorAll(".participant-email"))
      .find((participant) => participant.textContent === email);

    if (isRegistered && !existingParticipant) {
      if (participantsList.querySelector(".participants-empty")) {
        participantsList.replaceChildren();
      }
      participantsList.appendChild(createParticipantRow(activityName, email));
    } else if (!isRegistered && existingParticipant) {
      existingParticipant.parentElement.remove();
    } else {
      return;
    }

    const participantCount = participantsList.querySelectorAll(".participant-email").length;
    if (participantCount === 0) {
      const emptyMessage = document.createElement("li");
      emptyMessage.className = "participants-empty";
      emptyMessage.textContent = "No participants yet";
      participantsList.appendChild(emptyMessage);
    }

    participantsHeading.textContent = `Participants (${participantCount})`;
    availability.textContent = `${Number(activityCard.dataset.maxParticipants) - participantCount} spots left`;
  }

  async function removeParticipant(activityName, email, removeButton) {
    removeButton.disabled = true;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (response.ok) {
        updateActivityCard(activityName, email, false);
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
      } else {
        messageDiv.textContent = result.detail || "Could not remove participant.";
        messageDiv.className = "error";
        removeButton.disabled = false;
      }
    } catch (error) {
      messageDiv.textContent = "Failed to remove participant. Please try again.";
      messageDiv.className = "error";
      removeButton.disabled = false;
      console.error("Error removing participant:", error);
    }

    messageDiv.classList.remove("hidden");
    setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.replaceChildren(activitySelect.options[0]);

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        activityCard.dataset.activityName = name;
        activityCard.dataset.maxParticipants = details.max_participants;

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="activity-availability"><strong>Availability:</strong> <span>${spotsLeft} spots left</span></p>
        `;

        const participantsSection = document.createElement("div");
        participantsSection.className = "participants-section";

        const participantsHeading = document.createElement("h5");
        participantsHeading.className = "participants-heading";
        participantsHeading.textContent = `Participants (${details.participants.length})`;
        participantsSection.appendChild(participantsHeading);

        const participantsList = document.createElement("ul");
        participantsList.className = "participants-list";

        if (details.participants.length === 0) {
          const emptyMessage = document.createElement("li");
          emptyMessage.className = "participants-empty";
          emptyMessage.textContent = "No participants yet";
          participantsList.appendChild(emptyMessage);
        } else {
          details.participants.forEach((email) => {
            participantsList.appendChild(createParticipantRow(name, email));
          });
        }

        participantsSection.appendChild(participantsList);
        activityCard.appendChild(participantsSection);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        updateActivityCard(activity, email, true);
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
