import * as xb from 'xrblocks';

/**
 * Spatial UI Cards for Cosmic Core Defender XR
 * Adheres strictly to the xb-add-spatial-ui and XR Blocks guidelines.
 */

export interface SpatialUICallbacks {
  onStartGame: () => void;
  onRestartGame: () => void;
  onTriggerEMP: () => void;
  onTriggerShield: () => void;
}

export class SpatialUIManager {
  public titleCard: xb.UICard;
  public gameOverCard: xb.UICard;
  public statusCard: xb.UICard;

  private scoreText: xb.UIText;
  private waveText: xb.UIText;
  private hpText: xb.UIText;

  private gameOverTitle: xb.UIText;
  private gameOverSubtitle: xb.UIText;
  private gameOverStats: xb.UIText;

  constructor(private callbacks: SpatialUICallbacks) {
    // 1. Title Screen Card (친절한 한글 타이틀 & 가이드)
    this.titleCard = new xb.UICard({
      size: {width: 0.8, height: 'auto'},
      manipulation: true,
      edge: true,
      style: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        padding: 24,
        backgroundColor: 'rgba(5, 10, 24, 0.94)',
        borderRadius: 20,
      },
      children: [
        new xb.UIText({
          text: '🚀 스타파이터 콕핏 XR',
          style: {
            fontSize: 28,
            fontWeight: 'bold',
            textAlign: 'center',
            color: '#00f0ff',
          },
        }),
        new xb.UIText({
          text: '우주선 조종석에 앉아 양손으로 조종관을 잡고 다양한 지형을 비행하세요!',
          style: {
            fontSize: 16,
            lineHeight: 1.35,
            textAlign: 'center',
            opacity: 0.9,
          },
        }),
        new xb.UIPanel({
          style: {
            width: '100%',
            flexDirection: 'column',
            gap: 8,
            padding: 14,
            backgroundColor: 'rgba(0, 240, 255, 0.08)',
            borderRadius: 14,
          },
          children: [
            new xb.UIText({
              text: '🕹️ 조종관(Yoke): 기울여서 뱅킹 선회 및 앞뒤로 밀어 상승/하강!',
              style: {fontSize: 14, color: '#e0f8ff'},
            }),
            new xb.UIText({
              text: '💥 트윈 캐논: 트리거 또는 스페이스바로 전방 장애물 파괴!',
              style: {fontSize: 14, color: '#e0f8ff'},
            }),
            new xb.UIText({
              text: '⚡ 부스트 링: 공중의 빛나는 링을 통과해 초고속 가속!',
              style: {fontSize: 14, color: '#e0f8ff'},
            }),
          ],
        }),
        new xb.UIButton({
          label: '▶️ 비행 시작하기',
          icon: 'flight_takeoff',
          style: {
            width: '100%',
            height: 52,
            backgroundColor: '#00f0ff',
            color: '#050a18',
            fontSize: 18,
            fontWeight: 'bold',
            borderRadius: 14,
          },
          onClick: () => {
            this.callbacks.onStartGame();
          },
        }),
      ],
    });
    this.titleCard.position.set(0, 1.45, -1.25);
    this.titleCard.name = 'SpatialTitleCard';

    // 2. In-Game Floating Status Card (코어 바로 위에 떠 있는 직관적인 상태창)
    this.hpText = new xb.UIText({
      text: '🛡️ 코어 체력: 100%',
      style: {fontSize: 16, fontWeight: 'bold', color: '#00ff88'},
    });
    this.waveText = new xb.UIText({
      text: '웨이브 1',
      style: {fontSize: 16, fontWeight: 'bold', color: '#00f0ff'},
    });
    this.scoreText = new xb.UIText({
      text: '점수: 0000',
      style: {fontSize: 16, fontWeight: 'bold', color: '#ffb020'},
    });

    this.statusCard = new xb.UICard({
      size: {width: 0.68, height: 'auto'},
      manipulation: false,
      style: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: 'rgba(5, 12, 28, 0.88)',
        borderRadius: 14,
      },
      children: [this.waveText, this.hpText, this.scoreText],
    });
    this.statusCard.position.set(0, 1.85, -1.2);
    this.statusCard.name = 'SpatialStatusCard';
    this.statusCard.visible = false;

    // 3. Game Over / Victory Card
    this.gameOverTitle = new xb.UIText({
      text: '방어 실패',
      style: {fontSize: 30, fontWeight: 'bold', color: '#ff2244', textAlign: 'center'},
    });
    this.gameOverSubtitle = new xb.UIText({
      text: '파워 코어가 파괴되었습니다. 다시 도전해보세요!',
      style: {fontSize: 16, opacity: 0.85, textAlign: 'center'},
    });
    this.gameOverStats = new xb.UIText({
      text: '최종 점수: 0\n클리어 웨이브: 0 / 3',
      style: {fontSize: 18, lineHeight: 1.45, textAlign: 'center'},
    });

    this.gameOverCard = new xb.UICard({
      size: {width: 0.74, height: 'auto'},
      manipulation: true,
      edge: true,
      style: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: 24,
        backgroundColor: 'rgba(12, 6, 18, 0.96)',
        borderRadius: 20,
      },
      children: [
        this.gameOverTitle,
        this.gameOverSubtitle,
        this.gameOverStats,
        new xb.UIButton({
          label: '🔄 다시 플레이',
          icon: 'restart_alt',
          style: {
            width: '100%',
            height: 50,
            backgroundColor: '#00f0ff',
            color: '#050a18',
            fontSize: 18,
            fontWeight: 'bold',
            borderRadius: 12,
          },
          onClick: () => {
            this.callbacks.onRestartGame();
          },
        }),
      ],
    });
    this.gameOverCard.position.set(0, 1.45, -1.25);
    this.gameOverCard.name = 'SpatialGameOverCard';
    this.gameOverCard.visible = false;
  }

  public showTitle() {
    this.titleCard.visible = true;
    this.statusCard.visible = false;
    this.gameOverCard.visible = false;
  }

  public showPlaying() {
    this.titleCard.visible = false;
    this.statusCard.visible = true;
    this.gameOverCard.visible = false;
  }

  public updateStatus(hp: number, wave: number, score: number) {
    this.hpText.text = `🛡️ 코어 체력: ${Math.max(0, Math.round(hp))}%`;
    this.hpText.style.color = hp > 40 ? '#00ff88' : '#ff2244';
    this.waveText.text = `웨이브 ${wave}`;
    this.scoreText.text = `점수: ${score}`;
  }

  public showGameOver(victory: boolean, distanceMeters: number, ringsCollected: number, totalScore: number) {
    this.titleCard.visible = false;
    this.statusCard.visible = false;
    this.gameOverCard.visible = true;

    this.gameOverTitle.text = victory ? '🏁 비행 코스 완주!' : '💥 비행선 충돌 착륙';
    this.gameOverTitle.style.color = victory ? '#00ff88' : '#ff2244';
    this.gameOverSubtitle.text = victory
      ? '모든 지형 코스를 성공적으로 완주했습니다!'
      : '장애물과 충돌하여 쉴드가 소진되었습니다. 다시 도전해보세요!';

    this.gameOverStats.text =
      `총 비행 거리: ${distanceMeters} M\n` +
      `통과한 부스트 링: ${ringsCollected} 개\n` +
      `최종 획득 점수: ${totalScore} 점`;
  }
}
