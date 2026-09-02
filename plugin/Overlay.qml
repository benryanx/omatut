import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import qs.Commons
import qs.Ui

Item {
  id: root

  property var shell: null
  property var manifest: null
  property bool opened: false
  property string mode: "idle"
  property string statusMessage: "Ask OmaTut about your screen"
  property var thinkingWords: ["Analyzing the scene…", "Connecting the dots…", "Synthesizing a shortcut…", "Polishing the answer…"]
  property int thinkingWordIndex: 0
  property string label: "Here"
  property string explanation: ""
  property var steps: []
  property int currentStep: 0
  property string shortcut: ""
  property real targetX: 0
  property real targetY: 0
  property bool hasTarget: false
  property int duration: 14000

  function status(payloadJson) {
    var payload = ({})
    try { payload = JSON.parse(payloadJson || "{}") } catch (e) {}
    root.mode = payload.mode || "thinking"
    root.statusMessage = payload.message || (root.mode === "thinking" ? root.thinkingWords[0] : "OmaTut is ready")
    root.thinkingWordIndex = Math.max(0, root.thinkingWords.indexOf(root.statusMessage))
    root.hasTarget = false
    root.explanation = ""
    root.steps = []
    root.currentStep = 0
    root.shortcut = ""
    root.opened = true
    dismissTimer.stop()
    stepTimer.stop()
    if (root.mode === "thinking") thinkingTimer.restart()
    else thinkingTimer.stop()
  }

  function guide(payloadJson) {
    var payload = ({})
    try { payload = JSON.parse(payloadJson || "{}") } catch (e) {}
    root.mode = "guide"
    root.label = payload.label || "Here"
    root.explanation = payload.explanation || ""
    root.steps = payload.steps || []
    root.currentStep = 0
    root.shortcut = payload.shortcut || ""
    root.hasTarget = payload.targetX !== null && payload.targetY !== null && payload.targetX !== undefined && payload.targetY !== undefined
    root.targetX = root.hasTarget ? Number(payload.targetX) : panel.width / 2
    root.targetY = root.hasTarget ? Number(payload.targetY) : panel.height / 2
    root.statusMessage = root.steps.length > 1 ? "Step 1 of " + root.steps.length : "Guiding you · dismisses automatically"
    root.duration = Math.max(3000, Number(payload.duration || 14000))
    root.opened = true
    thinkingTimer.stop()
    revealAnimation.restart()
    if (root.steps.length > 1) stepTimer.restart()
    dismissTimer.restart()
  }

  function open(payloadJson) { guide(payloadJson) }
  function close() { dismiss() }
  function nextStep() {
    if (root.steps.length === 0) return
    if (root.currentStep < root.steps.length - 1) {
      root.currentStep += 1
      root.statusMessage = "Step " + (root.currentStep + 1) + " of " + root.steps.length
    } else {
      stepTimer.stop()
      root.statusMessage = "Guiding you · dismisses automatically"
    }
  }
  function dismiss() {
    root.opened = false
    dismissTimer.stop()
    stepTimer.stop()
    thinkingTimer.stop()
    if (root.shell && typeof root.shell.hide === "function")
      root.shell.hide((root.manifest && root.manifest.id) || "benryanx.omatut")
  }

  Timer {
    id: dismissTimer
    interval: root.duration
    onTriggered: root.dismiss()
  }

  Timer {
    id: stepTimer
    interval: 2800
    repeat: true
    onTriggered: root.nextStep()
  }

  Timer {
    id: thinkingTimer
    interval: 1100
    repeat: true
    onTriggered: {
      root.thinkingWordIndex = (root.thinkingWordIndex + 1) % root.thinkingWords.length
      root.statusMessage = root.thinkingWords[root.thinkingWordIndex]
    }
  }

  SequentialAnimation {
    id: revealAnimation
    NumberAnimation { target: guideLayer; property: "opacity"; from: 0; to: 1; duration: 220; easing.type: Easing.OutCubic }
  }

  IpcHandler {
    target: "omatut"
    function ping(): string { return "ok" }
    function status(payloadJson: string): string { root.status(payloadJson); return "ok" }
    function guide(payloadJson: string): string { root.guide(payloadJson); return "ok" }
    function dismiss(): string { root.dismiss(); return "ok" }
    function next(): string { root.nextStep(); return "ok" }
    function state(): string { return root.opened ? root.mode : "closed" }
  }

  PanelWindow {
    id: panel
    visible: root.opened
    anchors { top: true; bottom: true; left: true; right: true }
    color: "transparent"
    WlrLayershell.namespace: "omatut-guide"
    WlrLayershell.layer: WlrLayer.Overlay
    WlrLayershell.keyboardFocus: WlrKeyboardFocus.None
    exclusionMode: ExclusionMode.Ignore
    mask: Region {}

    Item {
      id: guideLayer
      anchors.fill: parent

      Item {
        id: targetMarker
        visible: root.mode === "guide" && root.hasTarget
        x: root.targetX - width / 2
        y: root.targetY - height / 2
        width: Style.space(18)
        height: width

        Rectangle {
          id: targetRing
          anchors.centerIn: parent
          width: parent.width
          height: width
          radius: width / 2
          color: Util.alpha(Color.accent, 0.18)
          border.width: Math.max(2, Style.space(2))
          border.color: Color.accent

          SequentialAnimation on scale {
            running: targetMarker.visible
            loops: Animation.Infinite
            NumberAnimation { from: 0.8; to: 1.65; duration: 850; easing.type: Easing.OutCubic }
            NumberAnimation { from: 1.65; to: 0.8; duration: 850; easing.type: Easing.InCubic }
          }
        }
      }

      Rectangle {
        id: hereLabel
        visible: root.mode === "guide" && root.hasTarget
        x: Math.max(Style.space(12), Math.min(panel.width - width - Style.space(12), root.targetX - width / 2))
        y: Math.max(Style.space(12), root.targetY - height - Style.space(17))
        width: hereText.implicitWidth + Style.space(20)
        height: Style.space(26)
        radius: height / 2
        color: Color.accent

        Text {
          id: hereText
          anchors.centerIn: parent
          text: root.label
          textFormat: Text.PlainText
          color: Color.background
          font.family: Style.font.family
          font.pixelSize: Style.font.caption
          font.bold: true
        }
      }

      Item {
        id: buddy
        width: Style.space(52)
        height: width
        x: root.mode === "guide" && root.hasTarget ? root.targetX - width / 2 : panel.width / 2 - width / 2
        y: root.mode === "guide" && root.hasTarget ? Math.max(Style.space(20), root.targetY - Style.space(86)) : panel.height - Style.space(128)

        Behavior on x { NumberAnimation { duration: 420; easing.type: Easing.OutCubic } }
        Behavior on y { NumberAnimation { duration: 420; easing.type: Easing.OutCubic } }

        Rectangle {
          anchors.fill: parent
          radius: width / 2
          color: root.mode === "thinking" ? Color.foreground : Color.accent
          border.width: Math.max(2, Style.space(2))
          border.color: Util.alpha(Color.popups.text, 0.45)

          SequentialAnimation on scale {
            running: root.mode === "thinking" || root.mode === "listening"
            loops: Animation.Infinite
            NumberAnimation { from: 1; to: 1.1; duration: 650; easing.type: Easing.InOutQuad }
            NumberAnimation { from: 1.1; to: 1; duration: 650; easing.type: Easing.InOutQuad }
          }

          Text {
            anchors.centerIn: parent
            text: root.mode === "listening" ? "●" : (root.mode === "thinking" ? "◌" : "✦")
            color: Color.background
            font.family: Style.font.family
            font.pixelSize: Style.font.display
            font.bold: true
          }
        }
      }

      BorderSurface {
        id: bubble
        visible: root.mode === "guide" && root.explanation !== ""
        width: Math.min(Style.space(360), panel.width - Style.space(32))
        height: bubbleContent.implicitHeight + Style.space(28)
        x: {
          if (!root.hasTarget) return panel.width / 2 - width / 2
          var right = root.targetX + Style.space(36)
          if (right + width < panel.width - Style.space(16)) return right
          return Math.max(Style.space(16), root.targetX - width - Style.space(26))
        }
        y: {
          if (!root.hasTarget) return panel.height / 2 - height / 2
          var above = root.targetY - height - Style.space(68)
          return above > Style.space(16) ? above : Math.min(panel.height - height - Style.space(76), root.targetY + Style.space(42))
        }
        color: Util.alpha(Color.popups.background, 0.96)
        borderSpec: Border.surfaceSpec("popups", "border", Color.popups.border, Math.max(1, Style.space(1)))
        radius: Style.cornerRadius

        Column {
          id: bubbleContent
          anchors.left: parent.left
          anchors.right: parent.right
          anchors.top: parent.top
          anchors.margins: Style.space(14)
          spacing: Style.space(8)

          Text {
            text: "OMATUT"
            color: Color.accent
            font.family: Style.font.family
            font.pixelSize: Style.font.caption
            font.bold: true
            font.letterSpacing: 1.5
          }

          Text {
            width: parent.width
            text: root.explanation
            textFormat: Text.PlainText
            wrapMode: Text.Wrap
            color: Color.popups.text
            font.family: Style.font.family
            font.pixelSize: Style.font.body
            lineHeight: 1.25
          }

          Rectangle {
            visible: root.shortcut !== ""
            width: parent.width
            height: Style.space(34)
            radius: Style.space(8)
            color: Util.alpha(Color.accent, 0.12)
            border.width: Math.max(1, Style.space(1))
            border.color: Util.alpha(Color.accent, 0.35)

            Text {
              anchors.centerIn: parent
              text: root.shortcut
              textFormat: Text.PlainText
              color: Color.accent
              font.family: Style.font.family
              font.pixelSize: Style.font.body
              font.bold: true
            }
          }

          Repeater {
            model: root.steps
            delegate: Row {
              required property var modelData
              required property int index
              width: bubbleContent.width
              spacing: Style.space(8)

              Rectangle {
                width: Style.space(18)
                height: width
                radius: width / 2
                color: index === root.currentStep ? Color.accent : Util.alpha(Color.accent, 0.14)
                border.width: index === root.currentStep ? 0 : Math.max(1, Style.space(1))
                border.color: Util.alpha(Color.accent, 0.35)
                Text {
                  anchors.centerIn: parent
                  text: index + 1
                  color: index === root.currentStep ? Color.background : Color.accent
                  font.family: Style.font.family
                  font.pixelSize: Style.font.caption
                  font.bold: true
                }
              }

              Text {
                width: parent.width - Style.space(26)
                text: modelData
                textFormat: Text.PlainText
                wrapMode: Text.Wrap
                color: index === root.currentStep ? Color.popups.text : Util.alpha(Color.popups.text, 0.65)
                font.family: Style.font.family
                font.pixelSize: Style.font.caption
              }
            }
          }
        }
      }

      BorderSurface {
        id: statusPill
        width: statusRow.implicitWidth + Style.space(28)
        height: Style.space(44)
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: parent.bottom
        anchors.bottomMargin: Style.space(26)
        color: Util.alpha(Color.popups.background, 0.96)
        borderSpec: Border.surfaceSpec("popups", "border", Color.popups.border, Math.max(1, Style.space(1)))
        radius: height / 2

        Row {
          id: statusRow
          anchors.centerIn: parent
          spacing: Style.space(9)

          Rectangle {
            width: Style.space(8)
            height: width
            radius: width / 2
            anchors.verticalCenter: parent.verticalCenter
            color: root.mode === "thinking" ? Color.foreground : Color.accent
          }
          Text {
            text: root.statusMessage
            textFormat: Text.PlainText
            color: Util.alpha(Color.popups.text, 0.72)
            font.family: Style.font.family
            font.pixelSize: Style.font.caption
          }
        }
      }
    }
  }
}
