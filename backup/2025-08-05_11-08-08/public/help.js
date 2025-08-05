// Help system for the assessment matrix application
function initHelpSystem(pageType, courseName = '') {
  // Create help icon
  const helpIcon = document.createElement('button');
  helpIcon.className = 'help-icon';
  helpIcon.innerHTML = '?';
  helpIcon.title = 'Hjälp';
  
  // Create help modal
  const helpModal = document.createElement('div');
  helpModal.className = 'help-modal';
  helpModal.innerHTML = `
    <div class="help-modal-content">
      <button class="help-close">&times;</button>
      <div id="help-content"></div>
    </div>
  `;
  
  document.body.appendChild(helpIcon);
  document.body.appendChild(helpModal);
  
  // Get help content based on page type
  const helpContent = getHelpContent(pageType, courseName);
  document.getElementById('help-content').innerHTML = helpContent;
  
  // Event listeners
  helpIcon.addEventListener('click', () => {
    helpModal.style.display = 'flex';
  });
  
  helpModal.querySelector('.help-close').addEventListener('click', () => {
    helpModal.style.display = 'none';
  });
  
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) {
      helpModal.style.display = 'none';
    }
  });
}

function getHelpContent(pageType, courseName) {
  const helpContents = {
    landing: `
      <h3>📚 Kursöversikt</h3>
      <div class="help-section">
        <h4>Skapa ny kurs</h4>
        <p>Klicka på "Skapa kurs" för att lägga till en ny kurs. Ange kursnamnet och tryck på "Skapa kurs".</p>
      </div>
      <div class="help-section">
        <h4>Välj kurs</h4>
        <p>Klicka på en kurs i listan för att öppna bedömningsmatrisen för den kursen.</p>
      </div>
      <div class="help-section">
        <h4>Kursinställningar</h4>
        <p>Klicka på kugghjulsikonen (⚙️) för att återställa raderade kurser. Kurser raderas automatiskt efter 6 månader.</p>
      </div>
      <div class="help-section">
        <h4>Kursfärger</h4>
        <p>Varje kurs kan tilldelas en färg som visas som en färgad kant på kurskortet.</p>
      </div>
    `,
    
    index: `
      <h3>📊 Bedömningsmatris - ${courseName}</h3>
      <div class="help-section">
        <h4>Välj student</h4>
        <p>Välj en student från rullgardinsmenyn för att visa deras bedömningsmatris.</p>
      </div>
      <div class="help-section">
        <h4>Lägg till uppgift</h4>
        <p>• Skriv uppgiftens namn<br>• Välj bedömningsområden genom att kryssa i rutorna<br>• Välj nivåer (E, C, A) och färger (grön, gul, röd)<br>• Klicka "Lägg till uppgift" för en student eller "Skapa för alla studenter" för alla</p>
      </div>
      <div class="help-section">
        <h4>Bedömningsmatris</h4>
        <p>• Klicka på uppgifter för att redigera dem<br>• Hovra över celler för att se bedömningsknappar<br>• Grön = Godkänd, Gul = Delvis, Grå = Ej bedömd (endast E-nivå)</p>
      </div>
      <div class="help-section">
        <h4>God Mode</h4>
        <p>Aktivera för att ta bort uppgifter utan bekräftelse. "Radera alla uppgifter" tar bort allt för den valda studenten.</p>
      </div>
    `,
    
    admin: `
      <h3>⚙️ Administration - ${courseName}</h3>
      <div class="help-section">
        <h4>Studenthantering</h4>
        <p>• Lägg till nya studenter med "Lägg till student"<br>• Dölj studenter tillfälligt med ögon-ikonen (🙈/👁️)<br>• Ta bort studenter permanent med papperskorgen (🗑️)</p>
      </div>
      <div class="help-section">
        <h4>Import/Export</h4>
        <p>• Exportera: Ladda ner alla studentdata som JSON-fil<br>• Importera: Välj en JSON-fil för att importera studentdata</p>
      </div>
      <div class="help-section">
        <h4>Bedömningsområden</h4>
        <p>• Redigera namn och beskrivning direkt i fälten<br>• Flytta områden upp/ner med pilarna (⬆️⬇️)<br>• Ta bort områden med papperskorgen (🗑️)</p>
      </div>
      <div class="help-section">
        <h4>Kursinställningar</h4>
        <p>• Ändra kursens visningsnamn<br>• Välj en färg för kursen från färgpaletten</p>
      </div>
      <div class="help-section">
        <h4>Farlig zon</h4>
        <p>Radera hela kursen permanent. Denna åtgärd kan inte ångras!</p>
      </div>
    `,
    
    restore: `
      <h3>🔄 Återställ studenter - ${courseName}</h3>
      <div class="help-section">
        <h4>Raderade studenter</h4>
        <p>Här visas alla studenter som har tagits bort från kursen.</p>
      </div>
      <div class="help-section">
        <h4>Återställa student</h4>
        <p>Klicka på "Återställ" för att lägga tillbaka en student i kursen med all deras data intakt.</p>
      </div>
      <div class="help-section">
        <h4>Information</h4>
        <p>• Datum visar när studenten togs bort<br>• All bedömningsdata bevaras när studenter återställs</p>
      </div>
    `,
    
    settings: `
      <h3>⚙️ Appinställningar</h3>
      <div class="help-section">
        <h4>Färginställningar</h4>
        <p>Anpassa färgerna för bedömningarna. Ändringarna påverkar alla nya bedömningar.</p>
      </div>
      <div class="help-section">
        <h4>Gränsvärden</h4>
        <p>Ställ in maximal längd för namn och beskrivningar. Hjälper till att hålla data konsistent.</p>
      </div>
      <div class="help-section">
        <h4>Beteendeinställningar</h4>
        <p>• Notifikationstid: Hur länge meddelanden visas<br>• Bekräfta borttagningar: Visa bekräftelsedialoger<br>• Verktygstips: Visa hjälptext vid hovring</p>
      </div>
      <div class="help-section">
        <h4>Spara och återställ</h4>
        <p>Inställningar sparas lokalt i webbläsaren. "Återställ till standard" återställer alla inställningar.</p>
      </div>
    `
  };
  
  return helpContents[pageType] || '<h3>Hjälp</h3><p>Ingen hjälp tillgänglig för denna sida.</p>';
}