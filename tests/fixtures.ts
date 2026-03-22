export const rankIndexFixture = `
  <main>
    <h3>Lion</h3>
    <h3>Kindergarten</h3>
    <a href="/programs/cub-scouts/adventures/lion/">View Lion Rank</a>
    <h3>Tiger</h3>
    <h3>1st Grade</h3>
    <a href="/programs/cub-scouts/adventures/tiger/">View Tiger Rank</a>
  </main>
`;

export const rankPageFixture = `
  <main>
    <section>
      <p>Character & Leadership</p>
      <p>Required</p>
      <a href="/cub-scout-adventures/bobcat-lion/">View Bobcat Lion</a>
    </section>
    <section>
      <p>Fun & Games</p>
      <p>Elective</p>
      <a href="/cub-scout-adventures/friends-are-fun/">View Friends Are Fun</a>
    </section>
  </main>
`;

export const adventurePageFixture = `
  <main id="main">
    <p>The Bobcat Adventure is the first required Adventure on the trail to earn the Lion badge of rank.</p>
    <h3>Requirement 1</h3>
    <p>Get to know the members of your den.</p>
    <h3>Requirement 2</h3>
    <p>Have your Lion adult partner or den leader read the Scout Law to you. Demonstrate your understanding of being friendly.</p>
    <h3>Requirement 3</h3>
    <p>Share a time when you did your best.</p>

    <h2>Requirement 1</h2>
    <article>
      <h2><a href="/cub-scout-activities/den-doodle-lion/">Den Doodle Lion</a></h2>
      <div>Indoor</div>
      <div>2</div>
      <div>4</div>
      <div>4</div>
      <p>The den doodle is a craft project that can be used to track attendance, reward good behavior, and completion of requirements.</p>
    </article>
    <article>
      <h2><a href="/cub-scout-activities/den-flag-lion/">Den Flag Lion</a></h2>
      <div>Indoor</div>
      <div>2</div>
      <div>3</div>
      <div>2</div>
      <p>A den flag craft that helps scouts learn names and build den identity.</p>
    </article>

    <h2>Requirement 2</h2>
    <article>
      <h2><a href="/cub-scout-activities/the-compliment-game/">The Compliment Game</a></h2>
      <div>Indoor</div>
      <div>1</div>
      <div>2</div>
      <div>1</div>
      <p>Everyone pays a compliment to each other in a game.</p>
    </article>

    <h2>Requirement 3</h2>
    <article>
      <h2><a href="/cub-scout-activities/when-am-i-doing-my-best/">When Am I Doing My Best?</a></h2>
      <div>Indoor</div>
      <div>1</div>
      <div>2</div>
      <div>1</div>
      <p>Activity to help Cub Scouts identify what it means to do their best.</p>
    </article>
  </main>
`;

export const activityPageFixture = `
  <main id="main">
    <p>Gather scouts in a circle and explain how compliments help a den feel friendly and welcoming.</p>
    <p>Invite each scout to offer one specific compliment to another scout.</p>
    <ul>
      <li>Use simple prompts for younger scouts.</li>
      <li>Keep the pace brisk and positive.</li>
    </ul>
  </main>
`;

export const noisyActivityPageFixture = `
  <main id="main">
    <script>
      jQuery(window).on('elementor/frontend/init', function() {
        tippy('#demo', { content: 'Energy Level of Cub Scouts' });
      });
    </script>
    <p>The den doodle is a craft project that can be used to track attendance, reward good behavior, and completion of requirements.</p>
    <p>Lion - Kindergarten Den Doodle Lion Indoor</p>
    <p>jQuery(window).on('elementor/frontend/init elementor/popup/show', function() { var $currentTooltip = '#eael'; });</p>
    <ul>
      <li>Let each scout add one piece to the den doodle.</li>
      <li>Display it at each meeting.</li>
    </ul>
  </main>
`;