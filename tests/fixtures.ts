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
      <div>2</div>
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
    <p>Energy Level of Cub Scouts 1 is very low energy to 5 is very high energy. 2</p>
    <p>Supply List for this Activity 1 No supplies needed to 5 custom build or uncommon items. 2</p>
    <p>Preparation Time for this Activity 1 minimal prep to 5 a week or more ahead of time. 1</p>
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
    <p>Energy Level of Cub Scouts 1 is very low energy to 5 is very high energy. 2</p>
    <p>Supply List for this Activity 1 No supplies needed to 5 custom build or uncommon items. 4</p>
    <p>Preparation Time for this Activity 1 minimal prep to 5 a week or more ahead of time. 2</p>
    <p>The den doodle is a craft project that can be used to track attendance, reward good behavior, and completion of requirements.</p>
    <p>Crayons of various colors, enough to share</p>
    <p>Lion - Kindergarten Den Doodle Lion Indoor</p>
    <p>jQuery(window).on('elementor/frontend/init elementor/popup/show', function() { var $currentTooltip = '#eael'; });</p>
    <ul>
      <li>Let each scout add one piece to the den doodle.</li>
      <li>Display it at each meeting.</li>
    </ul>
  </main>
`;

export const denDoodleActivityPageFixture = `
  <main id="main">
    <h1>Den Doodle Lion</h1>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-element elementor-widget elementor-widget-text-editor">
        <div class="elementor-widget-container">
          <span>Lion – Kindergarten</span>
        </div>
      </div>
      <div class="elementor-element elementor-widget elementor-widget-heading">
        <div class="elementor-widget-container">
          <span class="elementor-heading-title elementor-size-default">Bobcat Lion</span>
        </div>
      </div>
      <div class="elementor-element elementor-widget elementor-widget-heading">
        <div class="elementor-widget-container">
          <span class="elementor-heading-title elementor-size-default"><span>Character &amp; Leadership</span></span>
        </div>
      </div>
      <div class="elementor-element elementor-widget elementor-widget-heading">
        <div class="elementor-widget-container">
          <span class="elementor-heading-title elementor-size-default"><span>Required</span></span>
        </div>
      </div>
      <div class="elementor-element elementor-widget elementor-widget-text-editor">
        <div class="elementor-widget-container">
          <div>Requirement 1</div>
        </div>
      </div>
    </div>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-element elementor-widget elementor-widget-heading">
        <div class="elementor-widget-container">
          <h2 class="elementor-heading-title elementor-size-default">Snapshot of Activity</h2>
        </div>
      </div>
      <div class="elementor-element elementor-widget elementor-widget-text-editor">
        <div class="elementor-widget-container">
          <p>The den doodle is a craft project that can be used to track attendance, reward good behavior, and completion of requirements.&nbsp;</p>
        </div>
      </div>
    </div>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-element elementor-widget elementor-widget-icon-box">
        <div class="elementor-widget-container">
          <div class="elementor-icon-box-wrapper">
            <div class="elementor-icon-box-icon"><span class="elementor-icon"></span></div>
            <div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>Indoor</span></div></div>
          </div>
        </div>
      </div>
      <div class="elementor-element elementor-widget elementor-widget-icon-box">
        <div class="elementor-widget-container">
          <div class="elementor-icon-box-wrapper">
            <div class="elementor-icon-box-icon"><span class="elementor-icon"></span></div>
            <div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>3</span></div></div>
          </div>
        </div>
      </div>
      <div class="elementor-element elementor-widget elementor-widget-icon-box">
        <div class="elementor-widget-container">
          <div class="elementor-icon-box-wrapper">
            <div class="elementor-icon-box-icon"><span class="elementor-icon"></span></div>
            <div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>4</span></div></div>
          </div>
        </div>
      </div>
      <div class="elementor-element elementor-widget elementor-widget-icon-box">
        <div class="elementor-widget-container">
          <div class="elementor-icon-box-wrapper">
            <div class="elementor-icon-box-icon"><span class="elementor-icon"></span></div>
            <div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>4</span></div></div>
          </div>
        </div>
      </div>
    </div>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-element elementor-widget elementor-widget-heading">
        <div class="elementor-widget-container">
          <h3 class="elementor-heading-title elementor-size-default">Supply List</h3>
        </div>
      </div>
      <div class="elementor-element elementor-widget elementor-widget-html">
        <div class="elementor-widget-container">
          <p>Supply List Note: Den doodles can be made from different materials and there are several different designs. This is one example of a den doodle that can be made. It stands on its own and is four feet tall.</p>
          <p>Supply List: Cub Scouts will need their Lion handbook, page 3</p>
          <p>Pencils, one for each Cub Scout</p>
          <p>1 – ¼” plywood  3’ x 1’</p>
          <p>4 – 12 inch 2” x 1” boards for the base</p>
          <p>1 – 4 foot  2” x 1” board for the pole</p>
          <p>12 – 1 ½” wood screws</p>
          <p>200 grit sandpaper</p>
          <p>1-foot-long cord that is 3/16” or less than ¼” thick, one for each Cub Scout</p>
          <p>Power drill with a ¼” drill bit</p>
          <p>Gold spray paint</p>
          <p>Yellow spray paint</p>
          <p>Blue spray paint</p>
          <p>Black latex paint</p>
          <p>Fine paint brush for lettering</p>
          <p>Blue plastic pony beads, enough to present each Cub Scout with one for every den meeting</p>
          <p>Yellow plastic pony beads, enough to present each Cub Scout with one for every den meeting</p>
          <p>Gold plastic pony beads, enough to present each Cub Scout when they earn an elective Adventure</p>
          <p>White plastic pony beads, enough to present to each Cub Scout when they earn a required Adventure</p>
          <p>Add more colors of beads if you want to track or recognize other items such as wearing the uniform, bringing your handbook, good behavior, or helping others</p>
        </div>
      </div>
    </div>
    <div id="pp-accordion-tab-content-4652" class="pp-accordion-tab-content" data-tab="2" role="tabpanel" aria-labelledby="pp-accordion-tab-title-4652">
      <p>Before the meeting:&nbsp;</p>
      <ol>
        <li>Sand the edges of each board and the plywood to remove any rough edges.&nbsp;&nbsp;</li>
        <li>Paint the 3’ x 1’ plywood with gold spray paint and let it dry.&nbsp;</li>
        <li>Paint the four boards for the base that are 12-inch&nbsp; 1” x 2”&nbsp; with blue spray paint and let it dry.&nbsp;</li>
        <li>Paint the 4-foot board for the pole board with the yellow spray paint and let it dry.&nbsp;</li>
        <li>Using wood screws, attach one 12-inch 1” x 2” to each side of the bottom of the&nbsp; 4 foot&nbsp; 1” x 2” board for the pole so that the 12-inch 1” x 2” are vertical.&nbsp; See illustration in Additional Resources.&nbsp;</li>
        <li>With a pencil space out the names of each Cub Scout on the bottom of the 3’ x 1’&nbsp; ¼” plywood.&nbsp; Names may need to be placed at an angle or vertically to fit everyone.&nbsp; You may consider leaving one space open just in case a new Cub Scout joins the den later.&nbsp; Leave space to drill a hole below each name.&nbsp; See illustration in additional resources.&nbsp;</li>
        <li>Once names are properly placed and penciled in, paint the names using black latex paint and a fine paintbrush.&nbsp;</li>
        <li>Decorate the rest of the ¼” plywood with the pack number, Lion rank stickers or patches, etc., and let dry.&nbsp;</li>
        <li>Drill a hole under each name and attach a 1’ long cord under each name.&nbsp;&nbsp;</li>
        <li>Center the ¼” plywood to the top of the 4 ft.&nbsp; 1” x 2” and attach it with wood screws.&nbsp;</li>
      </ol>
      <p>&nbsp;</p>
      <p>During the meeting:&nbsp;</p>
      <ol>
        <li>Have Cub Scouts meet each other by signing each other’s handbooks on page 3.&nbsp;</li>
        <li>Introduce the den doodle to the den by letting the Cub Scouts know how they can earn a bead and what each color bead means.&nbsp;
          <ul style="list-style-type: disc">
            <li>Blue is for attending the den meeting, pack meeting, and other Cub Scout activities&nbsp;</li>
            <li>Yellow is for wearing their Cub Scout uniform to the den meeting&nbsp;</li>
            <li>White is for when they earn a required Adventure, in addition to their Adventure loop.&nbsp;</li>
            <li>Gold is for when they earn an elective Adventure, in addition to their Adventure loop.&nbsp;</li>
          </ul>
        </li>
        <li>At the end of each Den meeting award the beads to each Cub Scout and attach them to the cord on the den doodle below their name.&nbsp; Attach the beads by looping the bead(s) through the cord, push the beads to the top, and tie an overhand knot just below the last bead.&nbsp;</li>
        <li>Use the den doodle to reward positive behavior.&nbsp; Do not take beads away once they are earned.&nbsp;</li>
      </ol>
      <p>After the meeting:&nbsp;</p>
      <ol>
        <li>After each meeting look at the den doodle and look for Cub Scouts who may be lagging. Reach out to the adult partner to address any concerns about participation.&nbsp;</li>
      </ol>
    </div>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-element elementor-widget elementor-widget-heading">
        <div class="elementor-widget-container">
          <h3 class="elementor-heading-title elementor-size-default">Additional Resources</h3>
        </div>
      </div>
      <div class="elementor-element elementor-widget elementor-widget-html">
        <div class="elementor-widget-container">
          <p>Lion Bobcat 1&nbsp; Base of a Den Doodle image&nbsp;</p>
          <p>Lion Bobcat 1&nbsp; Den Doodle image&nbsp;</p>
        </div>
      </div>
    </div>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-element elementor-widget elementor-widget-heading">
        <div class="elementor-widget-container">
          <h3 class="elementor-heading-title elementor-size-default">Other Activities Options</h3>
        </div>
      </div>
      <p>Ignored content.</p>
    </div>
  </main>
`;

export const denFlagActivityPageFixture = `
  <main id="main">
    <h1>Den Flag Lion</h1>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-widget elementor-widget-text-editor">
        <div class="elementor-widget-container"><span>Lion – Kindergarten</span></div>
      </div>
      <div class="elementor-widget elementor-widget-heading">
        <div class="elementor-widget-container"><span class="elementor-heading-title elementor-size-default">Bobcat Lion</span></div>
      </div>
      <div class="elementor-widget elementor-widget-heading">
        <div class="elementor-widget-container"><span class="elementor-heading-title elementor-size-default"><span>Character &amp; Leadership</span></span></div>
      </div>
      <div class="elementor-widget elementor-widget-heading">
        <div class="elementor-widget-container"><span class="elementor-heading-title elementor-size-default"><span>Required</span></span></div>
      </div>
    </div>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-widget elementor-widget-heading">
        <div class="elementor-widget-container">
          <h2 class="elementor-heading-title elementor-size-default">Snapshot of Activity</h2>
        </div>
      </div>
      <div class="elementor-widget elementor-widget-text-editor">
        <div class="elementor-widget-container">
          <p>A den flag is a craft that can bring your den together by getting to know everyone’s name and having a symbol that everyone has a part in making.</p>
        </div>
      </div>
    </div>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-widget elementor-widget-icon-box"><div class="elementor-widget-container"><div class="elementor-icon-box-wrapper"><div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>Indoor</span></div></div></div></div></div>
      <div class="elementor-widget elementor-widget-icon-box"><div class="elementor-widget-container"><div class="elementor-icon-box-wrapper"><div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>2</span></div></div></div></div></div>
      <div class="elementor-widget elementor-widget-icon-box"><div class="elementor-widget-container"><div class="elementor-icon-box-wrapper"><div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>4</span></div></div></div></div></div>
      <div class="elementor-widget elementor-widget-icon-box"><div class="elementor-widget-container"><div class="elementor-icon-box-wrapper"><div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>4</span></div></div></div></div></div>
    </div>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-widget elementor-widget-heading">
        <div class="elementor-widget-container"><h3 class="elementor-heading-title elementor-size-default">Supply List</h3></div>
      </div>
      <div class="elementor-widget elementor-widget-html">
        <div class="elementor-widget-container">
          <p>Den flags can be made from different materials and there are several different designs. This is one example of a den flag that can be made. It can be used for a den up to 12 Cub Scouts, larger dens will need to adjust the dimensions of the flag. These instructions include a flagpole and stand.</p>
          <ul>
            <li>Cub Scouts will need their Lion handbook, page 3</li>
            <li>Pencils, one for each Cub Scout</li>
            <li>60” long 1 1/8” diameter wooden staff or dowel</li>
            <li>30” long ½” diameter wooden dowel</li>
            <li>Concrete mix</li>
            <li>Water</li>
            <li>Tin foil</li>
            <li>2-gallon paint bucket</li>
            <li>200 grit sandpaper</li>
            <li>2’ x 3’ gold felt (use dark yellow if gold isn’t available) – this is the flag, and it will be displayed vertically</li>
            <li>1 ½’ x 1’ black felt</li>
            <li>1 Lion badge of rank patch</li>
            <li>30” piece of twine or thin rope</li>
            <li>1 teacup hook</li>
            <li>7” x 7” black felt squares, one for each adult partner</li>
            <li>7” x 7” brown felt squares, one for each Cub Scout (If the den leader is not an adult partner of one of the Cub Scouts in the den, add another black felt square)</li>
            <li>Thick black Sharpie marker to write on brown felt squares</li>
            <li>White chalk, enough to share</li>
            <li>Scissors, one for each Cub Scout or enough to share</li>
            <li>Fabric glue</li>
          </ul>
        </div>
      </div>
    </div>
    <div id="pp-accordion-tab-content-4652" class="pp-accordion-tab-content" data-tab="2" role="tabpanel" aria-labelledby="pp-accordion-tab-title-4652">
      <p>Before the meeting:</p>
      <ol>
        <li>Wrap the bottom of the wooden staff with tin foil as high as the paint bucket is tall.</li>
        <li>Follow the directions for the concrete mix to fill the 2-gallon paint bucket ¾ of the way full.</li>
        <li>While the concrete is wet place the wooden staff, the end with the tin foil, into the bucket and hold it in place until the concrete is dry.</li>
        <li>Once the concrete is dry, remove the wood staff, and the tin foil will allow the pole to come out. This is the base for your den flag.</li>
        <li>Sand the ends of the wooden dowels and staff to remove sharp edges</li>
        <li>Lay the flag on a table so that it is vertical with the 2’ section as the bottom and top.</li>
        <li>Place the 1/2” dowel across the top and fold the top of the flag over by 1 inch to cover the wood dowel and glue the folded section to the flag to the back section of the flag with the wood dowel inside.</li>
        <li>Use the 1 1/2’ x 1’ black felt to cut out letters and numbers to spell the word “Pack” and the pack numbers. If your pack uses den numbers include the word “Den” and the den number. Letters and numbers should be 6” tall.</li>
        <li>Attach the letters and numbers using fabric glue to the top of the flag. Place the Pack and the number above the Den and number.</li>
        <li>Attach the teacup hook to the top of the flagpole.</li>
        <li>Attach the 30” twine or rope to each end of the dowel.</li>
      </ol>
      <p>During the meeting:</p>
      <ol>
        <li>Have Cub Scouts meet each other by signing each other’s handbooks on page 3.</li>
        <li>Give each Cub Scout a 7” x 7” orange felt square and each adult partner a 7” x 7” black felt square</li>
        <li>Have adult partners help their Cub Scout trace their hand (either left or right) onto the orange felt using the chalk and then help them cut out the shape of their hand.</li>
        <li>Have adult partners trace their hand (the same side as their Cub Scouts) onto the black felt using the chalk and cut out the shape of their hand.</li>
        <li>Have Cub Scouts write their name on the cut out of their hand.</li>
        <li>Have each Cub Scout and their adult partner glue the Cub Scout’s orange hand on top of the adult partner’s black hand, making sure the Cub Scout’s name is visible.</li>
        <li>Have each Cub Scout and adult partner glue their cut-out hands on the flag one by one. As they glue their cut-out hands onto the flag have them share what their favorite outdoor activity is and what their favorite food is.</li>
        <li>When all the hands are on the flag, attach the flag to the flagpole by hanging it by the twin or rope onto the teacup hook.</li>
      </ol>
    </div>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-widget elementor-widget-heading">
        <div class="elementor-widget-container"><h3 class="elementor-heading-title elementor-size-default">Additional Resources</h3></div>
      </div>
      <div class="elementor-widget elementor-widget-html">
        <div class="elementor-widget-container">
          <p>Lion Bobcat 1 Completed Den Flagpole Holder image</p>
          <p>Lion Bobcat 1 Completed Den Flag image</p>
        </div>
      </div>
    </div>
  </main>
`;

export const whenDoingMyBestActivityPageFixture = `
  <main id="main">
    <h1>When Am I Doing My Best?</h1>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-widget elementor-widget-text-editor">
        <div class="elementor-widget-container"><span>Lion – Kindergarten</span></div>
      </div>
      <div class="elementor-widget elementor-widget-heading">
        <div class="elementor-widget-container"><span class="elementor-heading-title elementor-size-default">Bobcat Lion</span></div>
      </div>
      <div class="elementor-widget elementor-widget-heading">
        <div class="elementor-widget-container"><span class="elementor-heading-title elementor-size-default"><span>Character &amp; Leadership</span></span></div>
      </div>
      <div class="elementor-widget elementor-widget-heading">
        <div class="elementor-widget-container"><span class="elementor-heading-title elementor-size-default"><span>Required</span></span></div>
      </div>
    </div>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-widget elementor-widget-heading">
        <div class="elementor-widget-container">
          <h2 class="elementor-heading-title elementor-size-default">Snapshot of Activity</h2>
        </div>
      </div>
      <div class="elementor-widget elementor-widget-text-editor">
        <div class="elementor-widget-container">
          <p>Activity to help Cub Scouts identify what it means to do their best.</p>
        </div>
      </div>
    </div>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-widget elementor-widget-icon-box"><div class="elementor-widget-container"><div class="elementor-icon-box-wrapper"><div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>Indoor</span></div></div></div></div></div>
      <div class="elementor-widget elementor-widget-icon-box"><div class="elementor-widget-container"><div class="elementor-icon-box-wrapper"><div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>2</span></div></div></div></div></div>
      <div class="elementor-widget elementor-widget-icon-box"><div class="elementor-widget-container"><div class="elementor-icon-box-wrapper"><div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>2</span></div></div></div></div></div>
      <div class="elementor-widget elementor-widget-icon-box"><div class="elementor-widget-container"><div class="elementor-icon-box-wrapper"><div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>2</span></div></div></div></div></div>
    </div>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-widget elementor-widget-heading">
        <div class="elementor-widget-container"><h3 class="elementor-heading-title elementor-size-default">Supply List</h3></div>
      </div>
      <div class="elementor-widget elementor-widget-html">
        <div class="elementor-widget-container">
          <ul>
            <li>Cub Scouts will need their Lion handbook, page 5</li>
            <li>Crayons, enough to share</li>
          </ul>
        </div>
      </div>
    </div>
    <div id="pp-accordion-tab-content-4652" class="pp-accordion-tab-content" data-tab="2" role="tabpanel" aria-labelledby="pp-accordion-tab-title-4652">
      <p>Before the meeting:</p>
      <ol>
        <li>Set up the meeting space to allow Cub Scouts to work on the activity.</li>
      </ol>
      <p>During the meeting:</p>
      <ol>
        <li>Gather Cub Scouts and adult partners and share with them that being a Cub Scout means that we always do our best. Ask Cub Scouts when do they know that they did their best? Allow Cub Scouts to answer.</li>
        <li>When everyone is done sharing, share with the den that only they know when they have done their best, but one thing is for sure, that doing nothing is never one’s best. Explain that you and their adult partners will always want the Cub Scouts to do their best.</li>
        <li>The Cub Scout motto is just that Do Your Best, and when you are doing your best, you will always get the most out of what you are doing. We will do a lot of new things in Cub Scouts, and you may not be good at everything we do the first time you try it. To get good at something you have to practice and do your best.</li>
        <li>Have adult partners work with their Cub Scout to complete the activity on page 5 of the Lion handbook.</li>
      </ol>
    </div>
  </main>
`;

export const lionHolidayDrawingActivityPageFixture = `
  <main id="main">
    <h1>Lion Holiday Drawing</h1>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-widget elementor-widget-text-editor">
        <div class="elementor-widget-container"><span>Lion – Kindergarten</span></div>
      </div>
      <div class="elementor-widget elementor-widget-heading">
        <div class="elementor-widget-container"><span class="elementor-heading-title elementor-size-default">Lion’s Pride</span></div>
      </div>
      <div class="elementor-widget elementor-widget-heading">
        <div class="elementor-widget-container"><span class="elementor-heading-title elementor-size-default"><span>Family &amp; Reverence</span></span></div>
      </div>
      <div class="elementor-widget elementor-widget-heading">
        <div class="elementor-widget-container"><span class="elementor-heading-title elementor-size-default"><span>Required</span></span></div>
      </div>
    </div>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-widget elementor-widget-heading">
        <div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">Snapshot of Activity</h2></div>
      </div>
      <div class="elementor-widget elementor-widget-text-editor">
        <div class="elementor-widget-container"><p>Draw and color a favorite faith tradition holiday or celebration.</p></div>
      </div>
    </div>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-widget elementor-widget-icon-box"><div class="elementor-widget-container"><div class="elementor-icon-box-wrapper"><div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>Indoor</span></div></div></div></div></div>
      <div class="elementor-widget elementor-widget-icon-box"><div class="elementor-widget-container"><div class="elementor-icon-box-wrapper"><div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>2</span></div></div></div></div></div>
      <div class="elementor-widget elementor-widget-icon-box"><div class="elementor-widget-container"><div class="elementor-icon-box-wrapper"><div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>2</span></div></div></div></div></div>
      <div class="elementor-widget elementor-widget-icon-box"><div class="elementor-widget-container"><div class="elementor-icon-box-wrapper"><div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>1</span></div></div></div></div></div>
    </div>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-widget elementor-widget-heading">
        <div class="elementor-widget-container"><h3 class="elementor-heading-title elementor-size-default">Supply List</h3></div>
      </div>
      <div class="elementor-widget elementor-widget-html">
        <div class="elementor-widget-container">
          <ul>
            <li>Cub Scouts will need their Lion handbook, page 22</li>
            <li>Crayons, enough to share</li>
          </ul>
        </div>
      </div>
    </div>
    <div id="pp-accordion-tab-content-4652" class="pp-accordion-tab-content" data-tab="2" role="tabpanel" aria-labelledby="pp-accordion-tab-title-4652">
      <p>At Home Option</p>
      <ol>
        <li>Discuss with your Cub Scout your family’s faith traditions that are connected to your religious beliefs.</li>
        <li>Together with your Cub Scout draw your favorite religious holiday, religious celebration, or family faith tradition. Some family traditions are things your family may do together during these times that are not directly connected to your religious beliefs. For some, it may be cooking a certain type of food, playing a certain game, or singing certain songs.</li>
      </ol>
      <p>Den Meeting Option</p>
      <p>Before the meeting:</p>
      <ol>
        <li>Create a space for Cub Scouts to draw and color.</li>
      </ol>
      <p>During the meeting:</p>
      <ol>
        <li>Share with Cub Scouts that a Cub Scout is Reverent and that means that they are faithful to their religious obligations and respect the beliefs of others.</li>
        <li>Share with Cub Scouts that religious holidays or celebrations are times for families and communities to come together. There are also family traditions that are connected to these events. For some, it may be cooking a certain type of food, playing a certain game, or singing certain songs.</li>
        <li>Think about your family’s faith traditions and draw a picture of it. Be ready to share your drawing when you are done.</li>
        <li>Have each Cub Scout describe their picture when they are done.</li>
      </ol>
    </div>
  </main>
`;

export const lionFamilyReverenceActivityPageFixture = `
  <main id="main">
    <h1>Lion Family Reverence</h1>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-widget elementor-widget-text-editor"><div class="elementor-widget-container"><span>Lion – Kindergarten</span></div></div>
      <div class="elementor-widget elementor-widget-heading"><div class="elementor-widget-container"><span class="elementor-heading-title elementor-size-default">Lion’s Pride</span></div></div>
      <div class="elementor-widget elementor-widget-heading"><div class="elementor-widget-container"><span class="elementor-heading-title elementor-size-default"><span>Family &amp; Reverence</span></span></div></div>
      <div class="elementor-widget elementor-widget-heading"><div class="elementor-widget-container"><span class="elementor-heading-title elementor-size-default"><span>Required</span></span></div></div>
    </div>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-widget elementor-widget-heading"><div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">Snapshot of Activity</h2></div></div>
      <div class="elementor-widget elementor-widget-text-editor"><div class="elementor-widget-container"><p>Attend a Veterans Day event with your den.</p></div></div>
    </div>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-widget elementor-widget-icon-box"><div class="elementor-widget-container"><div class="elementor-icon-box-wrapper"><div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>Travel</span></div></div></div></div></div>
      <div class="elementor-widget elementor-widget-icon-box"><div class="elementor-widget-container"><div class="elementor-icon-box-wrapper"><div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>3</span></div></div></div></div></div>
      <div class="elementor-widget elementor-widget-icon-box"><div class="elementor-widget-container"><div class="elementor-icon-box-wrapper"><div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>1</span></div></div></div></div></div>
      <div class="elementor-widget elementor-widget-icon-box"><div class="elementor-widget-container"><div class="elementor-icon-box-wrapper"><div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>5</span></div></div></div></div></div>
    </div>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-widget elementor-widget-heading"><div class="elementor-widget-container"><h3 class="elementor-heading-title elementor-size-default">Supply List</h3></div></div>
      <div class="elementor-widget elementor-widget-html"><div class="elementor-widget-container"><p>No supplies are required.</p></div></div>
    </div>
    <div id="pp-accordion-tab-content-4652" class="pp-accordion-tab-content" data-tab="2" role="tabpanel" aria-labelledby="pp-accordion-tab-title-4652">
      <p>Before the meeting:</p>
      <ol>
        <li>Veterans Day is November 11th because World War I officially ended on the 11th hour of the 11th day of the 11th month. Veterans Day honors those who served in the military. This is different from Memorial Day where those who served and died are honored.</li>
        <li>Identify Veterans Day activities in your community that your den can attend.</li>
        <li>Notify parents and guardians of the activity, date, time, and location.</li>
      </ol>
      <p>During the meeting:</p>
      <ol>
        <li>Gather the Cub Scouts and explain what Veterans Day is about.</li>
        <li>Ask Cub Scouts what are some ways they can show their appreciation to a veteran.</li>
        <li>Attend the Veterans Day activity.</li>
        <li>Afterwards ask Cub Scouts what they liked best about the activity.</li>
      </ol>
    </div>
  </main>
`;

export const protectYourselfVideoWebelosActivityPageFixture = `
  <main id="main">
    <h1>Protect Yourself Video Webelos</h1>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-widget elementor-widget-text-editor"><div class="elementor-widget-container"><span>Webelos – 4th Grade</span></div></div>
      <div class="elementor-widget elementor-widget-heading"><div class="elementor-widget-container"><span class="elementor-heading-title elementor-size-default">My Safety</span></div></div>
      <div class="elementor-widget elementor-widget-heading"><div class="elementor-widget-container"><span class="elementor-heading-title elementor-size-default"><span>Personal Safety</span></span></div></div>
      <div class="elementor-widget elementor-widget-heading"><div class="elementor-widget-container"><span class="elementor-heading-title elementor-size-default"><span>Required</span></span></div></div>
    </div>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-widget elementor-widget-heading"><div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">Snapshot of Activity</h2></div></div>
      <div class="elementor-widget elementor-widget-text-editor"><div class="elementor-widget-container"><p>Watch the Protect Yourself Rules video with your parent or legal guardian.</p></div></div>
    </div>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-widget elementor-widget-icon-box"><div class="elementor-widget-container"><div class="elementor-icon-box-wrapper"><div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>Indoor</span></div></div></div></div></div>
      <div class="elementor-widget elementor-widget-icon-box"><div class="elementor-widget-container"><div class="elementor-icon-box-wrapper"><div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>1</span></div></div></div></div></div>
      <div class="elementor-widget elementor-widget-icon-box"><div class="elementor-widget-container"><div class="elementor-icon-box-wrapper"><div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>2</span></div></div></div></div></div>
      <div class="elementor-widget elementor-widget-icon-box"><div class="elementor-widget-container"><div class="elementor-icon-box-wrapper"><div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>2</span></div></div></div></div></div>
    </div>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-widget elementor-widget-heading"><div class="elementor-widget-container"><h3 class="elementor-heading-title elementor-size-default">Supply List</h3></div></div>
      <div class="elementor-widget elementor-widget-html"><div class="elementor-widget-container"><ul><li>My Safety 1 Parent Notification found in Additional Resources</li><li>Computer or smart device</li><li>Internet connection to view the “Webelos Protect Yourself Rules” video (duration 22 minutes)</li><li>Or download video onto device if internet is not available where you will be watching.</li></ul></div></div>
    </div>
    <div id="pp-accordion-tab-content-4652" class="pp-accordion-tab-content" data-tab="2" role="tabpanel" aria-labelledby="pp-accordion-tab-title-4652">
      <p>Before the meeting:</p>
      <ol>
        <li>Inform parents, legal guardians, and adult partners of the Adventure and content. See the document “My Safety 1 Parent Notification” found in the Additional Resources section for Requirement 1</li>
      </ol>
      <p>During the meeting or at home:</p>
      <ol>
        <li>Parent or legal guardian watch the ”Protect Yourself Rules” video with their Cub Scout</li>
      </ol>
    </div>
    <div class="elementor-widget-wrap elementor-element-populated">
      <div class="elementor-widget elementor-widget-heading"><div class="elementor-widget-container"><h3 class="elementor-heading-title elementor-size-default">Additional Resources</h3></div></div>
      <div class="elementor-widget elementor-widget-html"><div class="elementor-widget-container"><p>My Safety 1 Parent Notification</p></div></div>
    </div>
  </main>
`;