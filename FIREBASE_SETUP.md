# Gemeinsame Charaktere: DND Stuff

Die Web-App ist für `dnd-stuff-6dbe2` konfiguriert. Google Analytics und Firebase Hosting werden nicht verwendet. Quillbound bleibt auf GitHub Pages. Lokales Spielen und Charakterdateien funktionieren weiterhin ohne Anmeldung.

## Einmalig in Firebase

1. [Authentication öffnen](https://console.firebase.google.com/project/dnd-stuff-6dbe2/authentication/providers). „Jetzt starten“ wählen, falls angezeigt. Unter Anmeldemethode **Google** aktivieren und die eigene Support-Adresse wählen.
2. Unter Authentication → Einstellungen → Autorisierte Domains **ryotsushigawa.github.io** ergänzen, ohne Protokoll und Pfad. `localhost` wird nur für lokale Entwicklung benötigt.
3. [Firestore öffnen](https://console.firebase.google.com/project/dnd-stuff-6dbe2/firestore). Eine **Standard**-Datenbank mit ID **(default)** und einem passenden europäischen Standort erstellen. **Produktionsmodus** wählen. Keine offenen Testregeln verwenden. Falls eine kostenpflichtige Aufrüstung verlangt wird, zunächst stoppen und die Meldung prüfen.
4. In Firestore → **Regeln** den Inhalt von [firestore.rules](firestore.rules) vollständig einfügen und **Veröffentlichen** klicken. Diese Regeln sind für Quillbounds Charakter-Datenbank bestimmt. Falls das Projekt bereits andere Daten enthält, zuerst deren bestehende Regeln sichern und zusammenführen.

Die öffentliche Web-Konfiguration enthält keinen Administratorzugang. Die Zugriffsregeln müssen trotzdem veröffentlicht werden: Sie begrenzen jeden Bogen auf das erstellende DM-Konto und das zugeordnete Spielerkonto. Ein fremdes oder nicht angemeldetes Konto darf die Bögen nicht lesen. Spieler können ihren zugeordneten Bogen einschließlich eigener Items bearbeiten; dies ist kein System zur Kontrolle von Spielbetrug.

## Gemeinsam spielen

1. Alle öffnen die öffentliche Quillbound-Website. Unter **My heroes → Gemeinsame Charaktere** zuerst die Google-Verbindung vorbereiten und dann **Mit Google anmelden** wählen. Der getrennte zweite Klick vermeidet blockierte Anmeldefenster in Firefox.
2. Jeder Spieler kopiert seinen **Spielercode** und gibt ihn dem DM.
3. DM: **DM desk → Adventure characters → Spieler verbinden** neben der richtigen Figur wählen, den Spielercode eintragen und bestätigen. Hierdurch wird genau dieser Bogen an Firebase übertragen.
4. Der Spieler findet die zugeordnete Figur automatisch unter **My heroes**. Über **Edit** bearbeiten und **Save changes** wählen. Gespeicherte Änderungen erscheinen auch beim DM. Vergebene Homebrew-Items werden genauso übertragen.

Der Spielercode ist die Kontokennung und keine geheime Einladung: Erst die bewusste Zuordnung durch den DM gibt Zugriff auf einen Bogen. Beide Seiten müssen unterschiedliche Google-Konten verwenden.

## Was abgeglichen wird

Charakterentscheidungen, Hintergrund, Training, Ausrüstung, Zauber-Auswahl, Geschichte, Homebrew-Items samt Ladungen und Begleiter. Keine Abenteuertexte, Karten, DM-Notizen, HP-Verläufe, Kampfressourcen oder Würfelwürfe. Magische Effekte werden weiter manuell angewendet.

Während ein Editor geöffnet ist, werden neue Fassungen zurückgehalten. Während eines Kampfes werden beim DM keine Charakter-Builds ausgetauscht. Nach dem Speichern beziehungsweise Kampfende wird weiter abgeglichen. Änderungen, die auf derselben älteren Fassung beruhen, werden nicht still überschrieben: **Abgleich prüfen** bietet eine lokale Sicherungsdatei und die Übernahme des gemeinsamen Standes. Bei Konflikten zuerst lokal sichern, gemeinsamen Stand übernehmen und die gewünschte Änderung dort erneut eintragen.

Die lokale Speicherung bleibt erhalten, wenn das Netz ausfällt. Ein fehlgeschlagener Cloud-Speichervorgang wird angezeigt. Unter **Abgleich prüfen → Verbindung erneut prüfen** lässt er sich wiederholen. Der Status „Synchronisiert“ bestätigt den zuletzt mit Firebase abgeglichenen Bogen, keine zusätzliche Komplettsicherung der Kampagne.

## Verbindung beenden und Geräte wechseln

DM: **Abgleich prüfen → Spielerverbindung beenden** entfernt nach Bestätigung den gemeinsamen Datenbankeintrag. Die vorhandenen lokalen Charakterkopien bleiben erhalten. Für einen anderen Spieler die alte Verbindung beenden und neu zuordnen.

„Remove“ entfernt nur die Figur aus der lokalen Abenteuergruppe, nicht die Firebase-Verbindung. Bereits verbundene Figuren können unter **Gemeinsame Charaktere** wieder zur aktuellen Gruppe hinzugefügt werden. Spieler können eine lokale Kopie löschen; sie wird anschließend nicht sofort erneut angelegt. Unter Gemeinsame Charaktere lässt sie sich wieder anzeigen.

Auf einem neuen DM-Gerät anmelden und dort die eigenen gemeinsamen Figuren ausdrücklich zur gewünschten lokalen Gruppe hinzufügen. Abenteuer und Karten müssen weiterhin separat importiert werden.

## Karten und gemeinsamer Verlauf während der Runde

Nach dem Zuordnen der Figuren startet der DM im Abschnitt **Live-Tisch** eine Sitzung. Die zugeordneten Spieler sehen sie unter **My heroes**. Bei mehreren aktiven Einladungen wählen sie den gewünschten Tisch. Es gibt keinen öffentlich lesbaren Kartenlink.

Die bereits freigegebene Spielerkarte wird bei Ortswechseln automatisch übertragen. Es wird ausschließlich das Bild aus Quillbounds Spieleranzeige verwendet, keine DM-Karte und keine gesamte Kartenbibliothek. **Karte ausblenden** stoppt die aktuelle automatische Freigabe. **Diese DM-Registerkarte verwenden** übernimmt bewusst die Kontrolle, wenn du den DM-Tab gewechselt hast. Nur der gewählte Tab in der passenden Kampagne sendet Bilder.

Der Live-Tisch zeigt Textchat und die letzten 100 Nachrichten beziehungsweise Würfe. Würfe aus dem My-heroes-Würfelroller werden in der aktiven Sitzung automatisch veröffentlicht, einschließlich verwendeter Boni und Einzelberechnung. Neue öffentliche Kampf-W20-Ergebnisse erscheinen als Zusammenfassung. Außerhalb einer Sitzung bleiben Würfe lokal. Die Zufallswürfe sind weiterhin clientseitig; der Verlauf ist kein serverseitiger Manipulationsschutz.

Eine Sitzung läuft höchstens acht Stunden. **Sitzung beenden** sperrt den Spielerzugriff und entfernt Bilder und Chat aus der Datenbank. Ablauf oder Schließen des DM-Tabs ist keine Löschung: Ablauf sperrt den Zugriff; der nächste Sitzungsstart räumt die vorherige Generation auf. Bereits geladene oder von Spielern gespeicherte Bilder lassen sich technisch nicht zurückholen.

Bilder werden als begrenzte Bildabschnitte in Firestore gespeichert; Firebase Storage wird dafür nicht benötigt. Sehr große Bilder werden für die Anzeige verkleinert. Die Grenze beträgt ungefähr 2 MB pro übertragener Karte. Eine neue Runde nutzt eine getrennte Generation, sodass alte Karten und Chats nicht erneut freigegeben werden. Das ist eine gemeinsame Kartenanzeige mit Verlauf; Figurenbewegung, Nebel des Krieges und ein kompletter virtueller Spieltisch sind nicht enthalten.

## Abnahmetest vor der Runde

Mit zwei unterschiedlichen Google-Konten auf getrennten Geräten testen: Spieler verbinden, Item vergeben, Eingang unter My heroes prüfen, dort Geschichte ändern und beim DM prüfen. Anschließend gleichzeitig unterschiedliche Änderungen speichern und die Konfliktanzeige prüfen. Dann eine Live-Sitzung starten: Karte wechseln, Spieleransicht prüfen, mit Guidance würfeln und den gemeinsamen Verlauf prüfen. Sitzung beenden und prüfen, dass die Spielerkarte und der Verlauf verschwinden. Ein drittes Konto darf den Bogen oder Sitzungsbilder nicht sehen. Lokale Modell- und Oberflächentests ersetzen diese Prüfung der tatsächlich veröffentlichten Firebase-Einstellungen nicht.

Offizielle Grundlagen: [Web-Einrichtung](https://firebase.google.com/docs/web/setup), [Google-Anmeldung](https://firebase.google.com/docs/auth/web/google-signin), [Firestore](https://firebase.google.com/docs/firestore/quickstart), [Zugriffsregeln](https://firebase.google.com/docs/firestore/security/rules-conditions).
